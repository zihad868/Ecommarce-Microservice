# Launch readiness sequence

Part A (error handling) and Part B (foundation work) must be reviewed and merged
before starting the following work. This change does not implement these launch
features.

1. Store integer minor units and ISO currency in catalog, orders and payments.
   Freeze prices and currency on each order. The v2 order contract currently
   converts the existing Decimal USD values at the transport boundary only.
2. Implement Stripe test-mode PaymentIntents from the stored order total with
   `pay:${orderId}` idempotency. Verify raw-body webhook signatures, deduplicate
   provider event IDs, and transactionally update payments and their outbox.
   Consume payment success/failure in order-service to pay or cancel/release
   stock. Payment simulation has been removed; add the payment API with this integration.
3. Add hashed, expiring single-use verification/reset tokens, login lockout,
   and optional TOTP MFA.
4. Implement Redis carts with TTL and re-price items at checkout.
5. Add addresses, carrier integration, and a tax provider at checkout.
6. Send order/payment notifications through a Kafka consumer and email provider.
7. Add consent records, account export, and account deletion.

The staging performance baseline remains pending until raw k6 results and the
deployment note described in [performance evidence](perf/README.md) are committed.
