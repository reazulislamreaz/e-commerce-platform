-- Outbox claim state for replica-safe relay
ALTER TYPE "OutboxStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';

-- AlterEnum OrderStatus
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PACKED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'EXCHANGED';

-- AlterEnum NotificationType
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DELIVERY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EXCHANGE_STATUS';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ABANDONED_CART';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LOW_STOCK';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "BannerPlacement" AS ENUM ('HOME_HERO', 'HOME_PROMO', 'SHOP_BANNER', 'SALE_BANNER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "BannerStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "CustomerSegmentKey" AS ENUM ('NEW', 'ACTIVE', 'HIGH_VALUE', 'AT_RISK', 'DORMANT', 'ONE_TIME');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ReportExportType" AS ENUM ('REVENUE', 'ORDERS', 'PRODUCTS', 'CUSTOMERS', 'INVENTORY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ReportExportFormat" AS ENUM ('CSV', 'XLSX');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ReportExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "CartRecoveryStatus" AS ENUM ('PENDING', 'SENT', 'CONVERTED', 'SUPPRESSED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "StockAlertLevel" AS ENUM ('LOW', 'OUT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- InventoryBalance threshold
ALTER TABLE "inventory_balance"
  ADD COLUMN IF NOT EXISTS "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;

DO $$ BEGIN
  ALTER TABLE "inventory_balance"
    ADD CONSTRAINT "inventory_balance_low_stock_threshold_nonneg"
    CHECK ("lowStockThreshold" >= 0);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- InventoryReservation expiry
ALTER TABLE "inventory_reservation"
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "releasedAt" TIMESTAMPTZ(3);

CREATE INDEX IF NOT EXISTS "inventory_reservation_status_expiresAt_idx"
  ON "inventory_reservation"("status", "expiresAt");

-- CustomerOrder workflow fields
ALTER TABLE "customer_order"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "processingAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "packedAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "returnedAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "exchangedAt" TIMESTAMPTZ(3);

CREATE INDEX IF NOT EXISTS "customer_order_createdAt_idx"
  ON "customer_order"("createdAt" DESC);

-- Payment future gateway + analytics indexes
ALTER TABLE "payment"
  ADD COLUMN IF NOT EXISTS "providerRef" TEXT;

CREATE INDEX IF NOT EXISTS "payment_status_collectedAt_idx"
  ON "payment"("status", "collectedAt" DESC);

-- Cart recovery email
ALTER TABLE "cart"
  ADD COLUMN IF NOT EXISTS "recoveryEmail" TEXT;

CREATE INDEX IF NOT EXISTS "cart_updatedAt_idx" ON "cart"("updatedAt");

-- ReturnRequest concurrency + condition attestation
ALTER TABLE "return_request"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "conditionAttested" BOOLEAN NOT NULL DEFAULT false;

-- Legacy single-variant column may exist from earlier drafts; drop if present.
ALTER TABLE "return_request" DROP COLUMN IF EXISTS "exchangeVariantId";

-- Per-line exchange replacement variant
ALTER TABLE "return_item"
  ADD COLUMN IF NOT EXISTS "exchangeVariantId" UUID;

CREATE INDEX IF NOT EXISTS "return_item_exchangeVariantId_idx"
  ON "return_item"("exchangeVariantId");

DO $$ BEGIN
  ALTER TABLE "return_item"
    ADD CONSTRAINT "return_item_exchangeVariantId_fkey"
    FOREIGN KEY ("exchangeVariantId") REFERENCES "product_variant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Stock alerts
CREATE TABLE IF NOT EXISTS "stock_alert" (
  "id" UUID NOT NULL,
  "balanceId" UUID NOT NULL,
  "level" "StockAlertLevel" NOT NULL,
  "available" INTEGER NOT NULL,
  "threshold" INTEGER NOT NULL,
  "resolvedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "stock_alert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stock_alert_resolvedAt_level_createdAt_idx"
  ON "stock_alert"("resolvedAt", "level", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "stock_alert_balanceId_resolvedAt_idx"
  ON "stock_alert"("balanceId", "resolvedAt");

-- At most one open alert per balance.
CREATE UNIQUE INDEX IF NOT EXISTS "stock_alert_balanceId_open_key"
  ON "stock_alert"("balanceId")
  WHERE "resolvedAt" IS NULL;

DO $$ BEGIN
  ALTER TABLE "stock_alert"
    ADD CONSTRAINT "stock_alert_balanceId_fkey"
    FOREIGN KEY ("balanceId") REFERENCES "inventory_balance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Customer metrics / CRM
CREATE TABLE IF NOT EXISTS "customer_metric" (
  "userId" UUID NOT NULL,
  "orderCount" INTEGER NOT NULL DEFAULT 0,
  "deliveredOrderCount" INTEGER NOT NULL DEFAULT 0,
  "lifetimeValuePoisha" BIGINT NOT NULL DEFAULT 0,
  "averageOrderPoisha" BIGINT NOT NULL DEFAULT 0,
  "lastOrderAt" TIMESTAMPTZ(3),
  "firstOrderAt" TIMESTAMPTZ(3),
  "cancelledOrderCount" INTEGER NOT NULL DEFAULT 0,
  "returnCount" INTEGER NOT NULL DEFAULT 0,
  "wishlistItemCount" INTEGER NOT NULL DEFAULT 0,
  "segmentKey" "CustomerSegmentKey" NOT NULL DEFAULT 'NEW',
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "customer_metric_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX IF NOT EXISTS "customer_metric_segmentKey_lifetimeValuePoisha_idx"
  ON "customer_metric"("segmentKey", "lifetimeValuePoisha" DESC);

CREATE INDEX IF NOT EXISTS "customer_metric_lifetimeValuePoisha_idx"
  ON "customer_metric"("lifetimeValuePoisha" DESC);

CREATE INDEX IF NOT EXISTS "customer_metric_lastOrderAt_idx"
  ON "customer_metric"("lastOrderAt" DESC);

DO $$ BEGIN
  ALTER TABLE "customer_metric"
    ADD CONSTRAINT "customer_metric_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "customer_segment_member" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "segmentKey" "CustomerSegmentKey" NOT NULL,
  "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL DEFAULT 'system',
  CONSTRAINT "customer_segment_member_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_segment_member_userId_segmentKey_key"
  ON "customer_segment_member"("userId", "segmentKey");

CREATE INDEX IF NOT EXISTS "customer_segment_member_segmentKey_assignedAt_idx"
  ON "customer_segment_member"("segmentKey", "assignedAt" DESC);

DO $$ BEGIN
  ALTER TABLE "customer_segment_member"
    ADD CONSTRAINT "customer_segment_member_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "customer_activity_event" (
  "id" BIGSERIAL NOT NULL,
  "userId" UUID NOT NULL,
  "eventType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "href" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_activity_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "customer_activity_event_userId_createdAt_idx"
  ON "customer_activity_event"("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "customer_activity_event_eventType_createdAt_idx"
  ON "customer_activity_event"("eventType", "createdAt" DESC);

DO $$ BEGIN
  ALTER TABLE "customer_activity_event"
    ADD CONSTRAINT "customer_activity_event_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Marketing banners
CREATE TABLE IF NOT EXISTS "marketing_banner" (
  "id" UUID NOT NULL,
  "placement" "BannerPlacement" NOT NULL,
  "status" "BannerStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "ctaLabel" TEXT,
  "ctaHref" TEXT,
  "imageUrl" TEXT NOT NULL,
  "mobileImageUrl" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMPTZ(3),
  "endsAt" TIMESTAMPTZ(3),
  "deletedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "marketing_banner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "marketing_banner_placement_status_position_idx"
  ON "marketing_banner"("placement", "status", "position");

CREATE INDEX IF NOT EXISTS "marketing_banner_status_startsAt_endsAt_idx"
  ON "marketing_banner"("status", "startsAt", "endsAt");

-- Abandoned cart recovery
CREATE TABLE IF NOT EXISTS "abandoned_cart_recovery" (
  "id" UUID NOT NULL,
  "cartId" UUID NOT NULL,
  "userId" UUID,
  "email" TEXT NOT NULL,
  "status" "CartRecoveryStatus" NOT NULL DEFAULT 'PENDING',
  "reminderCount" INTEGER NOT NULL DEFAULT 0,
  "nextSendAt" TIMESTAMPTZ(3) NOT NULL,
  "lastSentAt" TIMESTAMPTZ(3),
  "convertedAt" TIMESTAMPTZ(3),
  "suppressedAt" TIMESTAMPTZ(3),
  "cartSnapshot" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "abandoned_cart_recovery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "abandoned_cart_recovery_cartId_key"
  ON "abandoned_cart_recovery"("cartId");

CREATE INDEX IF NOT EXISTS "abandoned_cart_recovery_status_nextSendAt_idx"
  ON "abandoned_cart_recovery"("status", "nextSendAt");

CREATE INDEX IF NOT EXISTS "abandoned_cart_recovery_email_createdAt_idx"
  ON "abandoned_cart_recovery"("email", "createdAt" DESC);

DO $$ BEGIN
  ALTER TABLE "abandoned_cart_recovery"
    ADD CONSTRAINT "abandoned_cart_recovery_cartId_fkey"
    FOREIGN KEY ("cartId") REFERENCES "cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "abandoned_cart_recovery"
    ADD CONSTRAINT "abandoned_cart_recovery_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Report export jobs
CREATE TABLE IF NOT EXISTS "report_export_job" (
  "id" UUID NOT NULL,
  "requestedBy" UUID NOT NULL,
  "type" "ReportExportType" NOT NULL,
  "format" "ReportExportFormat" NOT NULL,
  "status" "ReportExportStatus" NOT NULL DEFAULT 'PENDING',
  "params" JSONB,
  "filePath" TEXT,
  "fileName" TEXT,
  "errorMessage" TEXT,
  "rowCount" INTEGER,
  "completedAt" TIMESTAMPTZ(3),
  "expiresAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "report_export_job_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "report_export_job_requestedBy_createdAt_idx"
  ON "report_export_job"("requestedBy", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "report_export_job_status_createdAt_idx"
  ON "report_export_job"("status", "createdAt" DESC);

DO $$ BEGIN
  ALTER TABLE "report_export_job"
    ADD CONSTRAINT "report_export_job_requestedBy_fkey"
    FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Backfill reservation expiry for existing ACTIVE holds (7 days from creation).
UPDATE "inventory_reservation"
SET "expiresAt" = "createdAt" + INTERVAL '7 days'
WHERE "status" = 'ACTIVE' AND "expiresAt" IS NULL;
