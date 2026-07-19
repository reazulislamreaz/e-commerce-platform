# Deploying to a VPS (CI/CD)

This directory contains everything needed to run Elevate Apparel in production on a
single VPS. Images are built and published by GitHub Actions to the GitHub
Container Registry (GHCR); the VPS pulls those images and runs them with Docker
Compose behind Nginx with automatic Let's Encrypt TLS.

## Pipeline overview

```
push to main ─► CI (lint · test · build · integration)
             ─► build-and-push (backend + frontend images ─► GHCR)
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
| backend   | NestJS API on :4000                                 | `product_uploads`, `report_exports` |
| frontend  | Next.js (standalone) on :3000                       | —                      |
| nginx     | Reverse proxy + TLS termination on :80/:443         | shares cert volumes    |
| certbot   | Renews certificates every 12h                       | `letsencrypt_certs`    |

Only Nginx is exposed publicly; everything else talks over the internal Docker network.

---

## One-time VPS setup

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # log out/in afterwards
```

### 2. DNS

Point both records at the VPS public IP:

- `A  example.com        -> <VPS_IP>`   (storefront, `APP_DOMAIN`)
- `A  api.example.com    -> <VPS_IP>`   (API, `API_DOMAIN`)

### 3. Create the deploy directory + secrets file

```bash
sudo mkdir -p /opt/elevate && sudo chown "$USER" /opt/elevate
cd /opt/elevate
# After the first pipeline run copies files here, create the env file:
cp .env.production.example .env
nano .env   # fill in domains, DB password, JWT secrets, SMTP, IMAGE_OWNER
```

Generate strong secrets: `openssl rand -hex 32` for each JWT secret.
`.env` stays **only** on the server — it is never committed and never overwritten
by the deploy (only `.env.production.example` is copied).

### 4. GitHub repository configuration

**Settings → Secrets and variables → Actions**

Secrets (Secrets tab):

| Secret          | Description                                              |
| --------------- | ------------------------------------------------------- |
| `VPS_HOST`      | VPS IP or hostname                                      |
| `VPS_USER`      | SSH user (member of the `docker` group)                 |
| `VPS_SSH_KEY`   | Private SSH key (PEM) authorized on the VPS             |
| `VPS_SSH_PORT`  | SSH port (e.g. `22`)                                    |
| `DEPLOY_PATH`   | Absolute deploy dir on the VPS (e.g. `/opt/elevate`)    |

Variables (Variables tab) — baked into the frontend image at build time:

| Variable                        | Example                          |
| ------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_API_URL`           | `https://api.example.com/api/v1` |
| `NEXT_PUBLIC_SITE_URL`          | `https://example.com`            |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`   | `8801XXXXXXXXX`                  |
| `NEXT_PUBLIC_WHATSAPP_MESSAGE`  | `Hi Elevate Apparel ...`         |
| `NEXT_PUBLIC_CONTACT_PHONE`     | `+8801XXXXXXXXX`                 |
| `NEXT_PUBLIC_FACEBOOK_PAGE_ID`  | `61579074209186`                 |
| `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` | (blank or real Pixel ID)         |

> The `GITHUB_TOKEN` used to push/pull images is provided automatically. Make sure
> **Settings → Actions → General → Workflow permissions** is set to *Read and write*.

### 5. First deploy + certificates

1. Push to `main` (or re-run the workflow). This publishes images and copies
   `docker-compose.prod.yml`, `nginx/`, and the scripts to `DEPLOY_PATH`, then
   runs `docker compose up -d`. Nginx will restart-loop until certificates exist —
   that's expected on the very first run.
2. On the VPS, issue the certificate (covers both domains) once:

```bash
cd /opt/elevate
# Optional dry run against staging to avoid rate limits: STAGING=1 ./init-letsencrypt.sh
./init-letsencrypt.sh
```

3. Seed the Super Admin + catalog fixtures **once**. The production image is
   dev-dependency-free, so run the seed from your machine through an SSH tunnel:

```bash
ssh -L 5432:localhost:5432 <VPS_USER>@<VPS_HOST>   # in one terminal
# in another, from the repo backend/ dir, with DATABASE_URL pointing at the tunnel
# and SEED_SUPER_ADMIN_* set:
DATABASE_URL='postgresql://ecommerce:<pw>@localhost:5432/ecommerce?schema=public' \
  npm run prisma:seed --workspace=backend
```

The site is now live at `https://example.com` with the API at `https://api.example.com`.

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
- To use a stricter pull credential than the ephemeral `GITHUB_TOKEN` (e.g. so
  containers can re-pull after a reboot without a pipeline run), create a PAT with
  `read:packages` and `docker login ghcr.io` on the VPS once.
