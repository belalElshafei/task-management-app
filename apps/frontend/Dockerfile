# Build Stage
FROM mirror.gcr.io/library/node:20-alpine AS builder

WORKDIR /app

# Enable BuildKit cache for npm
ENV NPM_CONFIG_CACHE=/root/.npm

# Copy root package files
COPY package*.json ./
# Copy ALL package.json files for workspace resolution
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# Use BuildKit cache mount to speed up npm install
# Increase npm reliability for flaky network
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=@task-management/frontend --no-audit --no-fund --registry=https://registry.npmmirror.com

# Copy frontend source
COPY apps/frontend ./apps/frontend

# Build the application
RUN npm run build --workspace=@task-management/frontend

# Production Stage
FROM mirror.gcr.io/library/node:20-alpine3.19 AS runner

WORKDIR /app

ENV NODE_ENV=production

# STANDALONE output
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/frontend/server.js"]
