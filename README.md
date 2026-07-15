# E-commerce Platform

Independent Next.js 16 and NestJS applications share this workspace while communicating only over the versioned REST API.

## Local development

1. Run `nvm use` to select Node 20 LTS. Copy `backend/.env.example` to `backend/.env` and set strong JWT secrets.
2. Copy `frontend/.env.example` to `frontend/.env.local`.
3. Start infrastructure with `docker compose up -d`.
4. Run `npm ci`, then `npm run prisma:generate --workspace=backend` and `npm run prisma:migrate --workspace=backend`.
5. Run `npm run dev:backend` and `npm run dev:frontend`.

The API is available at `http://localhost:4000/api/v1`, with Swagger at `http://localhost:4000/docs`.
