# Deploying to a VPS (CI/CD)

This directory contains everything needed to run Elevate Apparel in production on a
single VPS. Images are built and published by GitHub Actions to Docker Hub; the
VPS pulls those images and runs them with Docker Compose behind Nginx.

> **Current setup: IP-only, HTTP.** There is no domain, so the stack is served
> over plain **HTTP on port 8080** at the VPS IP (`http://206.162.244.11:8080`).
> Port 8080 is used because the VPS already runs a host nginx on :80/:443 for
> other apps. Nginx (containerized) uses a single origin: `/api` and `/uploads`
> go to the backend, everything else to the storefront. This is **not
> encrypted** — treat it as staging. To go secure, point a domain at the IP,
> add a TLS (443) server block, and flip `COOKIE_SECURE=true` (see "Adding
> HTTPS later" below).

## Pipeline overview

```
push to main ─► CI (lint · test · build · integration)
             ─► build-and-push (backend + frontend images ─► Docker Hub)
             ─► deploy (SSH to VPS ─► docker compose pull + up -d)
```

- Defined in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
- `build-and-push` and `deploy` run **only** on pushes to `main`, and **only**
  after `quality` and `integration` pass.
- Each deploy is pinned to the commit SHA (`IMAGE_TAG`), so rollbacks are just a
  redeploy of an older SHA.

## Stack (`docker-compose.prod.yml`)

| Service   | Purpose                                             | Persistence            |
| --------- | --------------------------------------------------- | ---------------------- |
| postgres  | PostgreSQL 17                                        | `postgres_data` volume |
| redis     | Redis 7 (BullMQ queues + cache)                     | `redis_data` volume    |
| migrate   | One-shot `prisma migrate deploy`, runs before backend | —                    |
| backend   | NestJS API on :4040                                 | `product_uploads`, `report_exports` |
| frontend  | Next.js (standalone) on :3030                       | —                      |
| nginx     | HTTP reverse proxy, host :8080 -> container :80     | —                      |

Only the containerized Nginx is exposed publicly (host port 8080); everything else talks over the internal Docker network.

---

## One-time VPS setup

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # log out/in afterwards
```

### 2. Network / firewall

No DNS is needed for the IP-only setup. Just make sure the VPS firewall allows
inbound **port 8080** (and your SSH port). Example with UFW:

```bash
sudo ufw allow 8080/tcp
sudo ufw allow <SSH_PORT>/tcp
```

### 3. Create the deploy directory + secrets file

```bash
sudo mkdir -p /opt/elevate && sudo chown "$USER" /opt/elevate
cd /opt/elevate
# After the first pipeline run copies files here, create the env file:
cp .env.production.example .env
nano .env   # fill in IMAGE_OWNER, DB password, JWT secrets, SMTP, FRONTEND_ORIGIN
            # keep COOKIE_SECURE=false while on HTTP
```

Generate strong secrets: `openssl rand -hex 32` for each JWT secret.

**Credential safety (important):**

| Where | What | Committed to GitHub? |
| ----- | ---- | -------------------- |
| GitHub Actions Secrets | `DOCKERHUB_*`, `VPS_*`, `DEPLOY_PATH` | No — encrypted in GitHub only |
| VPS `/opt/elevate/.env` | DB password, JWT, SMTP, etc. | No — gitignored; never SCP'd |
| `deploy/.env.production.example` | Placeholders only | Yes — safe template |
| Workflow YAML | `${{ secrets.NAME }}` references | Yes — no real values |

Never paste real tokens into `.env.production.example`, the workflow file, or chat/docs.
The deploy copies only compose/nginx/example files — it does **not** overwrite your
VPS `.env`.

### 4. GitHub repository configuration

**Settings → Secrets and variables → Actions**

Secrets (Secrets tab):

| Secret               | Description                                              |
| -------------------- | ------------------------------------------------------- |
| `DOCKERHUB_USERNAME` | Docker Hub username/namespace (also set as `IMAGE_OWNER` in `.env`) |
| `DOCKER_TOKEN`       | Docker Hub access token (Account → Security → New Access Token) |
| `VPS_HOST`           | VPS IP or hostname                                      |
| `VPS_USER`           | SSH user (member of the `docker` group)                 |
| `VPS_SSH_KEY`        | Private SSH key (PEM) authorized on the VPS             |
| `VPS_SSH_PORT`       | SSH port (e.g. `22`)                                    |
| `DEPLOY_PATH`        | Absolute deploy dir on the VPS (e.g. `/opt/elevate`)    |

Variables (Variables tab) — baked into the frontend image at build time:

| Variable                        | Example                          |
| ------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_API_URL`           | `http://206.162.244.11:8080/api/v1` |
| `NEXT_PUBLIC_SITE_URL`          | `http://206.162.244.11:8080`     |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`   | `8801XXXXXXXXX`                  |
| `NEXT_PUBLIC_WHATSAPP_MESSAGE`  | `Hi Elevate Apparel ...`         |
| `NEXT_PUBLIC_CONTACT_PHONE`     | `+8801XXXXXXXXX`                 |
| `NEXT_PUBLIC_FACEBOOK_PAGE_ID`  | `61579074209186`                 |
| `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` | (blank or real Pixel ID)         |

> Images are published to `docker.io/<DOCKERHUB_USERNAME>/elevate-backend` and
> `.../elevate-frontend`. Create the two repositories on Docker Hub (or push once
> so they're auto-created); keep them **private** if you don't want the images public.

### 5. First deploy

1. Push to `main` (or re-run the workflow). This publishes images and copies
   `docker-compose.prod.yml`, `nginx/conf.d/default.conf`, and the env template
   to `DEPLOY_PATH`, then runs `docker compose up -d`. Nginx comes up on host
   port 8080 immediately — no certificate step is required.
2. Bootstrap demo data **once** (optional). The `migrate` one-shot already runs
   `scripts/migrate-and-seed.sh`. In production it **skips** seeding unless you
   set `ENABLE_PRODUCTION_SEED=true` in the VPS `.env` (along with
   `SEED_SUPER_ADMIN_*` and related vars — see `.env.production.example` and
   [docs/DATABASE_SEED.md](../docs/DATABASE_SEED.md)).

   Prefer enabling that flag for the first roll only, then set it back to
   `false` so later deploys never re-seed. Alternatively, seed from your laptop
   over an SSH tunnel:

   **a.** On the VPS, temporarily add a loopback port to the `postgres` service
   in `docker-compose.prod.yml`, then apply it:

   ```yaml
   postgres:
     ports:
       - '127.0.0.1:5432:5432'   # TEMPORARY — remove after seeding
   ```

   ```bash
   docker compose --env-file .env -f docker-compose.prod.yml up -d postgres
   ```

   **b.** From your machine, open a tunnel to that port:

   ```bash
   ssh -L 5432:localhost:5432 <VPS_USER>@<VPS_HOST>   # keep open in one terminal
   ```

   **c.** In another terminal, from the repo root, with `SEED_SUPER_ADMIN_*` set:

   ```bash
   DATABASE_URL='postgresql://ecommerce:<pw>@localhost:5432/ecommerce?schema=public' \
     npm run prisma:seed --workspace=backend
   ```

   **d.** Remove the temporary `ports:` block on the VPS and re-run
   `up -d postgres`.

The site is now live at `http://206.162.244.11:8080` with the API under
`http://206.162.244.11:8080/api/v1`.

---

## Adding HTTPS later

TLS needs a domain (public CAs do not issue certificates for bare IPs). Once you
have one:

1. Point an `A` record at the VPS IP.
2. Update the GitHub Variables `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SITE_URL` and
   the VPS `.env` `FRONTEND_ORIGIN` to the `https://` domain, and set
   `COOKIE_SECURE=true`.
3. Add a TLS (443) server block to `nginx/conf.d/default.conf` (or reintroduce a
   certbot service) and an HTTP→HTTPS redirect, then redeploy.

---

## Day-to-day operations

Run from `DEPLOY_PATH` on the VPS:

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps          # status
docker compose --env-file .env -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env -f docker-compose.prod.yml restart nginx
```

### Rollback

Redeploy a previous image tag (any pushed commit SHA):

```bash
cd /opt/elevate
export IMAGE_TAG=<older-commit-sha>
docker compose --env-file .env -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.prod.yml up -d
```

### Database backup

```bash
docker compose --env-file .env -f docker-compose.prod.yml exec postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup-$(date +%F).sql
```

## Notes

- Uploaded product images (`product_uploads`) and report exports
  (`report_exports`) live in named volumes and survive redeploys.
- Migrations run automatically (the `migrate` service) before the backend starts;
  no manual migration step is needed on deploy.
- If your Docker Hub image repos are **private**, run `docker login` on the VPS once
  (with a `DOCKER_TOKEN`) so containers can re-pull after a reboot without a
  pipeline run. Public repos need no login to pull.
