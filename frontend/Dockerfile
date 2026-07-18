# Build from the repository root:
#   docker build -f frontend/Dockerfile -t ecommerce-frontend .
FROM node:20.19-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
RUN npm ci --workspace=frontend
COPY frontend frontend
RUN npm run build --workspace=frontend

FROM node:20.19-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/frontend/.next/standalone ./
COPY --from=build /repo/frontend/.next/static ./frontend/.next/static
COPY --from=build /repo/frontend/public ./frontend/public
USER node
CMD ["node", "frontend/server.js"]
