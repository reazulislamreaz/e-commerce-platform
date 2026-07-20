#!/usr/bin/env sh
# Zero-downtime production rollout for the Elevate Compose stack.
#
# Flow:
#   1. Pull new images (failure → abort; live stack untouched)
#   2. Run migrations + seed on the live DATABASE_URL (failure → abort; live stack untouched)
#   3. Start candidate backend_next / frontend_next beside the live stack
#   4. Wait until candidates pass Docker healthchecks (+ HTTP probes)
#   5. Point Nginx at candidates and reload
#   6. Recreate primary backend / frontend on the new image; wait healthy
#   7. Point Nginx back at primary; remove candidates
#   8. On any failure after cutover to candidates: keep candidates serving
#      (or restore primary upstreams if candidates die) and exit non-zero
#
# Usage (from DEPLOY_PATH on the VPS, IMAGE_TAG exported):
#   ./rollout.sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
cd "$ROOT_DIR"

COMPOSE="docker compose --env-file .env -f docker-compose.prod.yml"
UPSTREAMS="nginx/conf.d/upstreams.conf"
STATE_FILE=".deploy-state"
HEALTH_TIMEOUT_SEC="${HEALTH_TIMEOUT_SEC:-180}"

log() { printf '%s\n' "[rollout] $*"; }
err() { printf '%s\n' "[rollout] ERROR: $*" >&2; }

require_env_file() {
  if [ ! -f .env ]; then
    err ".env missing. Create it from .env.production.example before deploying."
    exit 1
  fi
}

require_image_tag() {
  if [ -z "${IMAGE_TAG:-}" ]; then
    err "IMAGE_TAG must be set (CI exports the git SHA)."
    exit 1
  fi
}

write_upstreams() {
  mode=$1
  case "$mode" in
    primary)
      backend_host=backend
      frontend_host=frontend
      ;;
    next)
      backend_host=backend_next
      frontend_host=frontend_next
      ;;
    *)
      err "unknown upstream mode: $mode"
      return 1
      ;;
  esac

  cat >"$UPSTREAMS" <<EOF
# Active upstream targets for the reverse proxy.
# Managed by deploy/rollout.sh — do not edit by hand during a rollout.
# Mode: ${mode}

upstream backend_upstream {
    server ${backend_host}:4040;
}

upstream frontend_upstream {
    server ${frontend_host}:3030;
}
EOF
}

reload_nginx() {
  if $COMPOSE ps --status running -q nginx >/dev/null 2>&1; then
    if ! $COMPOSE exec -T nginx nginx -t; then
      err "nginx config test failed"
      return 1
    fi
    $COMPOSE exec -T nginx nginx -s reload
    log "Nginx reloaded (upstreams → $1)"
  else
    log "Nginx not running yet — upstreams prepared for $1"
  fi
}

service_running() {
  service=$1
  cid=$($COMPOSE ps -q "$service" 2>/dev/null || true)
  [ -n "$cid" ]
}

wait_service_healthy() {
  service=$1
  deadline=$(( $(date +%s) + HEALTH_TIMEOUT_SEC ))
  log "Waiting for $service to become healthy (timeout ${HEALTH_TIMEOUT_SEC}s)..."
  while [ "$(date +%s)" -lt "$deadline" ]; do
    # compose ps --format may vary; fall back to docker inspect
    cid=$($COMPOSE ps -q "$service" 2>/dev/null || true)
    if [ -n "$cid" ]; then
      status=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo "missing")
      if [ "$status" = "healthy" ]; then
        log "$service is healthy"
        return 0
      fi
      if [ "$status" = "exited" ] || [ "$status" = "dead" ]; then
        err "$service container is $status"
        $COMPOSE logs --tail=80 "$service" || true
        return 1
      fi
    fi
    sleep 3
  done
  err "$service did not become healthy within ${HEALTH_TIMEOUT_SEC}s"
  $COMPOSE logs --tail=80 "$service" || true
  return 1
}

probe_backend() {
  service=$1
  cid=$($COMPOSE ps -q "$service" 2>/dev/null || true)
  [ -n "$cid" ] || return 1
  docker exec "$cid" node -e \
    'Promise.all([fetch("http://127.0.0.1:4040/api/v1/health"),fetch("http://127.0.0.1:4040/api/v1/health/ready")]).then(async([l,r])=>{if(!l.ok||!r.ok)process.exit(1)}).catch(()=>process.exit(1))'
}

probe_frontend() {
  service=$1
  cid=$($COMPOSE ps -q "$service" 2>/dev/null || true)
  [ -n "$cid" ] || return 1
  docker exec "$cid" node -e \
    'fetch("http://127.0.0.1:3030/").then((r)=>process.exit(r.ok||r.status===308||r.status===307?0:1)).catch(()=>process.exit(1))'
}

stop_candidates() {
  log "Removing candidate containers"
  $COMPOSE --profile rollout stop backend_next frontend_next 2>/dev/null || true
  $COMPOSE --profile rollout rm -f backend_next frontend_next 2>/dev/null || true
}

restore_primary_upstreams() {
  write_upstreams primary
  reload_nginx primary || true
}

save_state() {
  printf 'IMAGE_TAG=%s\nDEPLOYED_AT=%s\n' "$IMAGE_TAG" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$STATE_FILE"
}

cold_start() {
  log "No live backend detected — performing cold start"
  write_upstreams primary
  $COMPOSE pull
  log "Cold start: migrate + seed"
  $COMPOSE run --rm migrate
  $COMPOSE up -d postgres redis
  $COMPOSE up -d --no-deps backend
  wait_service_healthy backend
  probe_backend backend
  $COMPOSE up -d --no-deps frontend
  wait_service_healthy frontend
  probe_frontend frontend
  $COMPOSE up -d --no-deps nginx
  save_state
  log "Cold start complete (IMAGE_TAG=$IMAGE_TAG)"
}

rollback_after_failed_primary() {
  err "Primary recreate failed — keeping traffic on candidates"
  # Leave upstreams on next so the site stays up on the new image.
  # Operators can re-run rollout or manually restore.
  $COMPOSE logs --tail=100 backend frontend || true
}

# --- main -------------------------------------------------------------------

require_env_file
require_image_tag

log "Starting rollout for IMAGE_TAG=$IMAGE_TAG"

# Ensure shared infra is up (never recreates healthy postgres/redis unnecessarily)
$COMPOSE up -d postgres redis
$COMPOSE pull postgres redis >/dev/null 2>&1 || true

if ! service_running backend; then
  cold_start
  exit 0
fi

PREV_TAG=""
if [ -f "$STATE_FILE" ]; then
  PREV_TAG=$(sed -n 's/^IMAGE_TAG=//p' "$STATE_FILE" | head -1 || true)
fi
log "Previous successful IMAGE_TAG=${PREV_TAG:-unknown}"

# Always start from primary upstreams so a crashed mid-rollout recovers cleanly
write_upstreams primary
reload_nginx primary || true
stop_candidates

log "Pulling application images"
if ! $COMPOSE pull backend frontend migrate; then
  err "Image pull failed — live stack untouched"
  exit 1
fi

log "Applying database migrations + seed (live stack still serving)"
if ! $COMPOSE run --rm migrate; then
  err "Migration/seed failed — live stack untouched"
  exit 1
fi

log "Starting candidate containers alongside the live stack"
if ! $COMPOSE --profile rollout up -d --no-deps --pull missing backend_next; then
  err "Failed to start backend_next — live stack untouched"
  stop_candidates
  exit 1
fi
if ! wait_service_healthy backend_next || ! probe_backend backend_next; then
  err "backend_next failed health checks — live stack untouched"
  stop_candidates
  restore_primary_upstreams
  exit 1
fi

if ! $COMPOSE --profile rollout up -d --no-deps --pull missing frontend_next; then
  err "Failed to start frontend_next — live stack untouched"
  stop_candidates
  exit 1
fi
if ! wait_service_healthy frontend_next || ! probe_frontend frontend_next; then
  err "frontend_next failed health checks — live stack untouched"
  stop_candidates
  restore_primary_upstreams
  exit 1
fi

log "Candidates passed health + HTTP probes"

log "Cutting Nginx traffic over to candidates"
write_upstreams next
if ! reload_nginx next; then
  err "Nginx reload to candidates failed — restoring primary upstreams"
  restore_primary_upstreams
  stop_candidates
  exit 1
fi

log "Recreating primary backend/frontend on the new image (traffic on candidates)"
if ! $COMPOSE up -d --no-deps --force-recreate backend; then
  rollback_after_failed_primary
  exit 1
fi
if ! wait_service_healthy backend || ! probe_backend backend; then
  rollback_after_failed_primary
  exit 1
fi

if ! $COMPOSE up -d --no-deps --force-recreate frontend; then
  rollback_after_failed_primary
  exit 1
fi
if ! wait_service_healthy frontend || ! probe_frontend frontend; then
  rollback_after_failed_primary
  exit 1
fi

log "Cutting Nginx traffic back to primary"
write_upstreams primary
if ! reload_nginx primary; then
  err "Nginx reload to primary failed — switching back to candidates"
  write_upstreams next
  reload_nginx next || true
  exit 1
fi

stop_candidates

# Ensure nginx is running against primary
$COMPOSE up -d --no-deps nginx

save_state
log "Rollout succeeded (IMAGE_TAG=$IMAGE_TAG)"
