# Build from the repository root:
#   docker build -f backend/Dockerfile -t ecommerce-backend .
FROM node:20.19-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY backend/package.json backend/
RUN npm ci --workspace=backend
COPY backend backend
RUN npm run prisma:generate --workspace=backend && npm run build --workspace=backend

FROM node:20.19-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY backend/package.json backend/
RUN npm ci --workspace=backend --omit=dev && npm cache clean --force
COPY backend/prisma backend/prisma
# Prisma client is generated into the workspace node_modules tree during build.
COPY --from=build /repo/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /repo/node_modules/@prisma/client /app/node_modules/@prisma/client
COPY --from=build /repo/backend/dist backend/dist
USER node
WORKDIR /app/backend
CMD ["node", "dist/main"]
