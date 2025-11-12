# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy workspace files
COPY pnpm-workspace.yaml package.json ./
COPY packages/types ./packages/types
COPY packages/config ./packages/config
COPY apps/service-api ./apps/service-api
COPY apps/worker ./apps/worker

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build service-api first (worker depends on it)
WORKDIR /app/apps/service-api
RUN pnpm build

# Build worker
WORKDIR /app/apps/worker
RUN pnpm build

# Runtime stage - use distroless for security
FROM gcr.io/distroless/nodejs20-debian12:nonroot

WORKDIR /app

# Copy built applications (worker needs service-api dist)
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/package.json ./
COPY --from=builder /app/apps/service-api/dist ./service-api-dist
COPY --from=builder /app/node_modules ./node_modules

# Use non-root user (distroless provides this)
USER nonroot

ENTRYPOINT ["node", "dist/worker.js"]

