# COD Smoke Checklist

Automated coverage:

```bash
npm run test:integration --workspace=backend
# or focused:
npm run test:smoke:cod
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

1. Open `http://localhost:3000/shop`, open a product with stock, add to bag.
2. Go to `/checkout`, fill BD phone + Dhaka address, keep COD, place order.
3. Confirm redirect to account order detail (signed in) or `/order-confirmation` (guest).
4. Track via `/track-order` with order number + email.
5. Optional signed-in: apply `ELEVATE10` or `FREESHIP`, place another COD order.
6. Admin: sign in as seeded Super Admin, open `/admin/orders`, Process → Ship (tracking) → Deliver.
7. After delivery, open the order and submit a review; publish it from `/admin/reviews`.

SMTP note: when `SMTP_USER` is unset, verification/order emails are logged by the worker instead of sent.
