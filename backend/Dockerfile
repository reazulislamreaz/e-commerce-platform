# Build from the repository root:
#   docker build -f backend/Dockerfile -t ecommerce-backend .
FROM node:20.19-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY backend/package.json backend/
RUN npm ci --workspace=backend
COPY backend backend
# prisma.config.ts resolves env('DATABASE_URL') at config load even for
# `prisma generate` (no DB connection is made) — any placeholder works.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npm run prisma:generate --workspace=backend && npm run build --workspace=backend

FROM node:20.19-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY backend/package.json backend/
RUN npm ci --workspace=backend --omit=dev && npm cache clean --force
COPY backend/prisma backend/prisma
COPY backend/prisma.config.ts backend/prisma.config.ts
COPY backend/scripts backend/scripts
# Catalog seed imports the frontend fixture (types-only + product rows).
# Keep this set complete — data.ts must not pull files omitted from the image.
COPY frontend/features/products/data.ts frontend/features/products/data.ts
COPY frontend/features/products/types.ts frontend/features/products/types.ts
COPY frontend/features/products/constants.ts frontend/features/products/constants.ts
# Prisma Client is generated into src/generated (compiled into dist by nest build).
COPY --from=build /repo/backend/dist backend/dist
# Seed needs the generated Prisma client + argon2 at runtime.
COPY --from=build /repo/backend/src/generated backend/src/generated
USER node
WORKDIR /app/backend
EXPOSE 4000
CMD ["node", "dist/main"]
