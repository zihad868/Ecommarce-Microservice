#!/bin/sh
set -eu
case "$APP_WORKSPACE" in
  api-gateway) cd /app/edge/api-gateway ;;
  identity-service|catalog-service|order-service|inventory-service|payment-service|cart-service|search-service|notification-service|media-service)
    cd "/app/services/$APP_WORKSPACE" ;;
  *) echo "Unknown APP_WORKSPACE" >&2; exit 1 ;;
esac
if [ "$#" -gt 0 ]; then exec "$@"; fi
exec node --require @ecommerce/observability/dist/tracing.js dist/server.js
