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

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build
WORKDIR /app/apps/service-api
RUN pnpm build

# Runtime stage - use distroless for security
FROM gcr.io/distroless/nodejs20-debian12:nonroot

WORKDIR /app

# Copy built application
COPY --from=builder /app/apps/service-api/dist ./dist
COPY --from=builder /app/apps/service-api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Use non-root user (distroless provides this)
USER nonroot

EXPOSE 3000

ENTRYPOINT ["node", "dist/server.js"]

