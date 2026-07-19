#!/usr/bin/env bash
# One-time Let's Encrypt bootstrap for the production stack.
#
# Solves the nginx<->certbot chicken-and-egg problem: nginx cannot start with an
# SSL block until a certificate exists, but webroot issuance needs nginx serving
# the ACME challenge. This creates a temporary self-signed cert, starts nginx,
# then replaces it with a real Let's Encrypt cert covering both domains.
#
# Run once on the VPS, from the deploy/ directory, after `.env` is in place:
#   ./init-letsencrypt.sh
#
# Re-running is safe; pass STAGING=1 while testing to avoid rate limits.
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "ERROR: .env not found in $(pwd). Copy .env.production.example to .env first." >&2
  exit 1
fi
set -a; . ./.env; set +a

: "${APP_DOMAIN:?APP_DOMAIN must be set in .env}"
: "${API_DOMAIN:?API_DOMAIN must be set in .env}"
: "${CERTBOT_EMAIL:?CERTBOT_EMAIL must be set in .env}"

COMPOSE="docker compose --env-file .env -f docker-compose.prod.yml"
CERT_PATH="/etc/letsencrypt/live/${APP_DOMAIN}"

staging_arg=""
if [ "${STAGING:-0}" != "0" ]; then
  staging_arg="--staging"
  echo "Using Let's Encrypt STAGING environment."
fi

echo "### Downloading recommended TLS parameters ..."
$COMPOSE run --rm --entrypoint "/bin/sh -c '\
  [ -f /etc/letsencrypt/options-ssl-nginx.conf ] || wget -qO /etc/letsencrypt/options-ssl-nginx.conf https://raw.githubusercontent.com/certbot/certbot/main/certbot-nginx/src/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf; \
  [ -f /etc/letsencrypt/ssl-dhparams.pem ] || wget -qO /etc/letsencrypt/ssl-dhparams.pem https://raw.githubusercontent.com/certbot/certbot/main/certbot/src/certbot/ssl-dhparams.pem'" certbot

echo "### Creating a temporary self-signed certificate for ${APP_DOMAIN} ..."
$COMPOSE run --rm --entrypoint "/bin/sh -c '\
  mkdir -p ${CERT_PATH} && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout ${CERT_PATH}/privkey.pem -out ${CERT_PATH}/fullchain.pem \
    -subj \"/CN=localhost\"'" certbot

echo "### Starting nginx ..."
$COMPOSE up -d nginx

echo "### Removing the temporary certificate ..."
$COMPOSE run --rm --entrypoint "/bin/sh -c 'rm -rf /etc/letsencrypt/live/${APP_DOMAIN} /etc/letsencrypt/archive/${APP_DOMAIN} /etc/letsencrypt/renewal/${APP_DOMAIN}.conf'" certbot

echo "### Requesting a Let's Encrypt certificate for ${APP_DOMAIN} and ${API_DOMAIN} ..."
$COMPOSE run --rm --entrypoint "/bin/sh -c '\
  certbot certonly --webroot -w /var/www/certbot \
    ${staging_arg} \
    --email ${CERTBOT_EMAIL} --agree-tos --no-eff-email --non-interactive \
    --cert-name ${APP_DOMAIN} \
    -d ${APP_DOMAIN} -d ${API_DOMAIN}'" certbot

echo "### Reloading nginx ..."
$COMPOSE exec nginx nginx -s reload

echo "Done. HTTPS is now configured for https://${APP_DOMAIN} and https://${API_DOMAIN}."
