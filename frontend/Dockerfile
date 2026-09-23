# syntax=docker/dockerfile:1.7
# AssetCare SPA. Build Angular once; serve the static files with an unprivileged nginx.
# Runtime configuration (API URL, issuer, client id) is rendered into /config.json from environment variables at start,
# so the same image runs in every environment.

FROM node:26.8-alpine3.24 AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN npm run build -- --configuration production

FROM nginxinc/nginx-unprivileged:1.31-alpine AS runtime
LABEL org.opencontainers.image.title="assetcare-frontend" \
      org.opencontainers.image.source="https://github.com/Janaka2/spring-angular-production-blueprint" \
      org.opencontainers.image.licenses="Apache-2.0"
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/40-render-config.sh /docker-entrypoint.d/40-render-config.sh
COPY --from=build /workspace/dist/frontend/browser/ /usr/share/nginx/html/
# the image runs as uid 101 (nginx) already; config.json must be writable by it for the entrypoint render
USER root
RUN chmod +x /docker-entrypoint.d/40-render-config.sh && chown 101:101 /usr/share/nginx/html/config.json
USER 101
ENV API_URL="http://localhost:8080" OIDC_ISSUER="http://localhost:8081/realms/assetcare" OIDC_CLIENT_ID="assetcare-spa"
EXPOSE 8080
