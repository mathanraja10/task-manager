# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Task Manager frontend - build with Vite, serve static files with nginx.
#
#   deps     npm ci
#   dev      Vite dev server with HMR (used by compose.dev.yml)
#   build    produces /app/dist
#   runtime  nginx: serves the SPA and proxies /api to the backend
# ---------------------------------------------------------------------------

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- dev: source is bind-mounted over /app ----------------------------------
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npx", "vite", "--host", "0.0.0.0"]

# ---- build ------------------------------------------------------------------
FROM deps AS build
# Baked in at build time. The default '/api' is same-origin: nginx below
# proxies it to the backend, so no CORS setup is needed.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
COPY . .
RUN npm run build

# ---- runtime ----------------------------------------------------------------
# The unprivileged nginx image runs as a non-root user and listens on 8080.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
