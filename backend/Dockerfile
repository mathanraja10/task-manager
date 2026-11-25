# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Task Manager API - multi-stage build
#
#   deps     all dependencies + generated Prisma client
#   migrate  one-shot image that runs `prisma migrate deploy` (and seed)
#   dev      nodemon with source bind-mounted (used by compose.dev.yml)
#   runtime  production image: prod deps only, non-root, no build tools
# ---------------------------------------------------------------------------

ARG NODE_VERSION=24

# Debian slim (glibc) instead of Alpine: Prisma's query engine needs OpenSSL
# and works out of the box on glibc.
FROM node:${NODE_VERSION}-bookworm-slim AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- deps: install everything once, generate the Prisma client -------------
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci
RUN npx prisma generate

# ---- migrate: has the prisma CLI (a devDependency) for migrations/seed ------
FROM deps AS migrate
ENV NODE_ENV=production
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

# ---- dev: hot reload, source is bind-mounted over /app ----------------------
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
USER node
EXPOSE 5000
CMD ["npx", "nodemon", "src/server.js"]

# ---- prod-deps: drop devDependencies, keep the generated client -------------
FROM deps AS prod-deps
RUN npm prune --omit=dev && npm cache clean --force

# ---- runtime: final production image ----------------------------------------
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=5000
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node src ./src

USER node
EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Run node directly (not `npm start`) so SIGTERM reaches the app and its
# graceful shutdown in server.js runs.
CMD ["node", "src/server.js"]
