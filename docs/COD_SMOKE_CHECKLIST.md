# COD Smoke Checklist

Automated coverage:

```bash
npm run test:integration --workspace=backend
# or focused:
npm run test --workspace=backend -- orders.cod.smoke.integration.ts
npm run test --workspace=backend -- reviews.smoke.integration.ts
```

Includes guest COD place → idempotent replay → public track, plus delivered-purchase review → admin publish → public PDP aggregate.

## Manual browser smoke

Prerequisites:

```bash
docker compose up -d
npm run prisma:migrate --workspace=backend
npm run prisma:seed --workspace=backend
npm run dev:backend
npm run dev:frontend
```

### Storefront

1. Open `http://localhost:3000/shop`, open a product with stock, add to bag.
2. Go to `/checkout`, fill BD phone + Dhaka address, keep COD, place order.
3. Confirm redirect to account order detail (signed in) or `/order-confirmation` (guest).
4. Track via `/track-order` with order number + email.
5. Optional signed-in: apply `ELEVATE10` or `FREESHIP`, place another COD order.
6. Account: edit profile/phone, add multiple shipping addresses, set default, manage wishlist.
7. After delivery (admin step below): submit a return/exchange with condition attestation (unworn + tags). Sale items must be exchange-only.

### Admin

1. Sign in as seeded Super Admin, open `/admin/orders`.
2. Process → Pack → Ship (tracking) → Deliver.
3. `/admin/inventory`: confirm stock alerts and manual adjustment.
4. `/admin/returns`: approve/complete a return or exchange.
5. `/admin/customers`: open a customer profile, check segment/LTV/activity.
6. `/admin/banners`: create/edit a HOME_HERO or SALE_BANNER creative.
7. `/admin/analytics`: view revenue/sales/bestsellers; export a CSV/XLSX report.
8. After delivery, publish a review from `/admin/reviews`.

### Background / email

SMTP note: when `SMTP_USER` is unset, verification/order/welcome/shipping/delivered/payment/abandoned-cart emails are logged by the worker instead of sent.

BullMQ platform jobs (outbox relay, retention, inventory expiry, CRM backfill) and cart-recovery scan run automatically while the API process is up (requires Redis).

### Explicitly deferred

- Online payments (bKash/card)
- Invoice generation / download / print
- Review media uploads
