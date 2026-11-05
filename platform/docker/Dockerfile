FROM node:22-alpine3.21 AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json turbo.json ./
COPY packages ./packages
COPY services ./services
COPY edge ./edge
COPY contracts ./contracts
COPY tools ./tools
RUN npm ci --ignore-scripts
RUN npm run db:generate
RUN npm run build
# Prisma CLI remains available for the explicit migration job.
RUN npm prune --omit=dev --ignore-scripts

FROM node:22-alpine3.21 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ARG WORKSPACE=api-gateway
ENV APP_WORKSPACE=$WORKSPACE
COPY --from=builder --chown=node:node /app /app
COPY --chmod=755 platform/docker/entrypoint.sh /usr/local/bin/ecommerce-entrypoint
USER node
ENTRYPOINT ["ecommerce-entrypoint"]
