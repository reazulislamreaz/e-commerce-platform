# Build from the repository root:
#   docker build -f frontend/Dockerfile -t ecommerce-frontend .
FROM node:20.19-alpine AS build
WORKDIR /repo
ENV HUSKY=0
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
RUN npm ci --workspace=frontend
COPY frontend frontend
# NEXT_PUBLIC_* values are inlined at build time, so they must be supplied
# as build args when the image is built in CI (see .github/workflows/ci.yml).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_WHATSAPP_NUMBER
ARG NEXT_PUBLIC_WHATSAPP_MESSAGE
ARG NEXT_PUBLIC_CONTACT_PHONE
ARG NEXT_PUBLIC_FACEBOOK_PAGE_ID
ARG NEXT_PUBLIC_FACEBOOK_PIXEL_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER \
    NEXT_PUBLIC_WHATSAPP_MESSAGE=$NEXT_PUBLIC_WHATSAPP_MESSAGE \
    NEXT_PUBLIC_CONTACT_PHONE=$NEXT_PUBLIC_CONTACT_PHONE \
    NEXT_PUBLIC_FACEBOOK_PAGE_ID=$NEXT_PUBLIC_FACEBOOK_PAGE_ID \
    NEXT_PUBLIC_FACEBOOK_PIXEL_ID=$NEXT_PUBLIC_FACEBOOK_PIXEL_ID
RUN npm run build --workspace=frontend

FROM node:20.19-alpine AS production
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
EXPOSE 3000
COPY --from=build /repo/frontend/.next/standalone ./
COPY --from=build /repo/frontend/.next/static ./frontend/.next/static
COPY --from=build /repo/frontend/public ./frontend/public
USER node
CMD ["node", "frontend/server.js"]
