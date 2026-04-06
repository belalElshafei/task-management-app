# Use specific version for reproducibility
FROM mirror.gcr.io/library/node:20-alpine

# Set working directory
WORKDIR /app

# Enable BuildKit cache for npm
ENV NPM_CONFIG_CACHE=/root/.npm

# Copy root package files
COPY package*.json ./
# Copy ALL package.json files for workspace resolution
COPY apps/backend/package*.json ./apps/backend/
COPY apps/frontend/package*.json ./apps/frontend/

# Use BuildKit cache mount to speed up npm install
# Increase npm reliability for flaky network
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=@task-management/backend --omit=dev --no-audit --no-fund --registry=https://registry.npmmirror.com

# Copy backend source code
COPY apps/backend ./apps/backend

# Expose the API port
EXPOSE 5000

# Start command
CMD ["npm", "start", "--workspace=@task-management/backend"]
