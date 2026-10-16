# ── Stage 1: Build & Prune ──────────────────────────────────
FROM node:22-alpine3.21 AS builder

WORKDIR /app

# Copy root monorepo package manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/common/package.json ./packages/common/
COPY auth-service/package.json ./auth-service/
COPY product-service/package.json ./product-service/
COPY order-service/package.json ./order-service/

# Install dependencies across the monorepo
RUN npm ci

# Copy source trees and protos
COPY protos/ ./protos/
COPY packages/common/ ./packages/common/
COPY auth-service/ ./auth-service/

# Build shared common library
RUN npm run build -w packages/common

# Generate Prisma client and compile TypeScript for auth-service
WORKDIR /app/auth-service
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Production Runtime ──────────────────────────────
FROM node:22-alpine3.21 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV GRPC_PORT=50051

# Create non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy node_modules, compiled dist, and protos
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/packages/common/dist ./packages/common/dist
COPY --from=builder --chown=appuser:appgroup /app/packages/common/package.json ./packages/common/package.json
COPY --from=builder --chown=appuser:appgroup /app/protos ./protos
COPY --from=builder --chown=appuser:appgroup /app/auth-service/dist ./auth-service/dist
COPY --from=builder --chown=appuser:appgroup /app/auth-service/prisma ./auth-service/prisma
COPY --from=builder --chown=appuser:appgroup /app/auth-service/package.json ./auth-service/package.json

WORKDIR /app/auth-service

USER appuser

EXPOSE 3001 50051

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health/live || exit 1

CMD ["node", "dist/server.js"]
