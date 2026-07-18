-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('SHIPPING', 'BILLING');

-- CreateEnum
CREATE TYPE "PromotionRewardType" AS ENUM ('PERCENT_OFF', 'FIXED_OFF', 'FREE_SHIPPING');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COLLECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CONSUMED');

-- CreateEnum
CREATE TYPE "ReturnType" AS ENUM ('RETURN', 'EXCHANGE');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('WELCOME', 'ORDER_STATUS', 'SHIPPING', 'RETURN_STATUS', 'SECURITY', 'MARKETING', 'SYSTEM', 'CONTACT_ACK');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ContactMessageStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM');

-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('ACTIVE', 'UNSUBSCRIBED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('NEWSLETTER', 'MARKETING_EMAIL', 'ORDER_EMAIL', 'CONTACT_FORM');

-- CreateEnum
CREATE TYPE "ConsentAction" AS ENUM ('GRANTED', 'WITHDRAWN', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryMovementType" ADD VALUE 'RESERVE';
ALTER TYPE "InventoryMovementType" ADD VALUE 'RELEASE';

-- CreateTable
CREATE TABLE "idempotency_key" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseCode" INTEGER,
    "responseBody" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "idempotency_key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_event" (
    "id" BIGSERIAL NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "actorUserId" UUID,
    "actorRole" "Role",
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "requestId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Bangladesh',
    "type" "AddressType" NOT NULL DEFAULT 'SHIPPING',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preference" (
    "userId" UUID NOT NULL,
    "emailOrderUpdates" BOOLEAN NOT NULL DEFAULT true,
    "emailMarketing" BOOLEAN NOT NULL DEFAULT false,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_preference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "consent_event" (
    "id" BIGSERIAL NOT NULL,
    "userId" UUID,
    "email" TEXT NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "action" "ConsentAction" NOT NULL,
    "source" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "guestTokenHash" CHAR(64),
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'BDT',
    "version" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_item" (
    "id" UUID NOT NULL,
    "cartId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cart_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_item" (
    "wishlistId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_item_pkey" PRIMARY KEY ("wishlistId","productId")
);

-- CreateTable
CREATE TABLE "promotion" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'ACTIVE',
    "rewardType" "PromotionRewardType" NOT NULL,
    "percentOff" INTEGER,
    "fixedOffPoisha" BIGINT,
    "minOrderPoisha" BIGINT NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMPTZ(3),
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon" (
    "id" UUID NOT NULL,
    "promotionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "maxRedemptionsGlobal" INTEGER,
    "maxRedemptionsPerUser" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemption" (
    "id" UUID NOT NULL,
    "couponId" UUID NOT NULL,
    "userId" UUID,
    "orderId" UUID NOT NULL,
    "discountPoisha" BIGINT NOT NULL DEFAULT 0,
    "shippingWaived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_order" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "userId" UUID,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "notes" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'CONFIRMED',
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'BDT',
    "subtotalPoisha" BIGINT NOT NULL,
    "shippingPoisha" BIGINT NOT NULL,
    "discountPoisha" BIGINT NOT NULL DEFAULT 0,
    "totalPoisha" BIGINT NOT NULL,
    "couponCode" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3),
    "shippedAt" TIMESTAMPTZ(3),
    "deliveredAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),

    CONSTRAINT "customer_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_address" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "type" "AddressType" NOT NULL DEFAULT 'SHIPPING',
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Bangladesh',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPricePoisha" BIGINT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" BIGSERIAL NOT NULL,
    "orderId" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT,
    "actorId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'COD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountPoisha" BIGINT NOT NULL,
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'BDT',
    "collectedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reservation" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "inventory_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reservation_item" (
    "id" UUID NOT NULL,
    "reservationId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "inventory_reservation_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "carrier" TEXT,
    "shippedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_request" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "ReturnType" NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "decidedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "return_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_item" (
    "id" UUID NOT NULL,
    "returnRequestId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "return_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_status_history" (
    "id" BIGSERIAL NOT NULL,
    "returnRequestId" UUID NOT NULL,
    "status" "ReturnStatus" NOT NULL,
    "note" TEXT,
    "actorId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMPTZ(3),
    "dedupeKey" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3),

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_delivery" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "errorCode" TEXT,
    "attemptedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_message" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "userId" UUID,
    "status" "ContactMessageStatus" NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "resolvedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "contact_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_subscription" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "userId" UUID,
    "status" "NewsletterStatus" NOT NULL DEFAULT 'ACTIVE',
    "consentAt" TIMESTAMPTZ(3) NOT NULL,
    "consentTextVersion" TEXT NOT NULL,
    "unsubscribeTokenHash" CHAR(64) NOT NULL,
    "unsubscribedAt" TIMESTAMPTZ(3),
    "source" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "newsletter_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idempotency_key_expiresAt_idx" ON "idempotency_key"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_key_scope_key_key" ON "idempotency_key"("scope", "key");

-- CreateIndex
CREATE INDEX "outbox_event_status_availableAt_idx" ON "outbox_event"("status", "availableAt");

-- CreateIndex
CREATE INDEX "outbox_event_eventType_createdAt_idx" ON "outbox_event"("eventType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_log_resourceType_resourceId_createdAt_idx" ON "audit_log"("resourceType", "resourceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_log_actorUserId_createdAt_idx" ON "audit_log"("actorUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "address_userId_createdAt_idx" ON "address"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "consent_event_email_purpose_createdAt_idx" ON "consent_event"("email", "purpose", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "consent_event_userId_createdAt_idx" ON "consent_event"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "cart_userId_key" ON "cart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_guestTokenHash_key" ON "cart"("guestTokenHash");

-- CreateIndex
CREATE INDEX "cart_expiresAt_idx" ON "cart"("expiresAt");

-- CreateIndex
CREATE INDEX "cart_item_variantId_idx" ON "cart_item"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_item_cartId_variantId_key" ON "cart_item"("cartId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_userId_key" ON "wishlist"("userId");

-- CreateIndex
CREATE INDEX "wishlist_item_productId_idx" ON "wishlist_item"("productId");

-- CreateIndex
CREATE INDEX "promotion_status_startsAt_idx" ON "promotion"("status", "startsAt");

-- CreateIndex
CREATE INDEX "coupon_promotionId_idx" ON "coupon"("promotionId");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_code_key" ON "coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemption_orderId_key" ON "coupon_redemption"("orderId");

-- CreateIndex
CREATE INDEX "coupon_redemption_couponId_userId_idx" ON "coupon_redemption"("couponId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_order_number_key" ON "customer_order"("number");

-- CreateIndex
CREATE INDEX "customer_order_userId_createdAt_idx" ON "customer_order"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "customer_order_email_createdAt_idx" ON "customer_order"("email", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "customer_order_status_createdAt_idx" ON "customer_order"("status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "order_address_orderId_key" ON "order_address"("orderId");

-- CreateIndex
CREATE INDEX "order_item_orderId_idx" ON "order_item"("orderId");

-- CreateIndex
CREATE INDEX "order_item_variantId_idx" ON "order_item"("variantId");

-- CreateIndex
CREATE INDEX "order_status_history_orderId_createdAt_idx" ON "order_status_history"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_orderId_key" ON "payment"("orderId");

-- CreateIndex
CREATE INDEX "payment_status_createdAt_idx" ON "payment"("status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_reservation_orderId_key" ON "inventory_reservation"("orderId");

-- CreateIndex
CREATE INDEX "inventory_reservation_status_createdAt_idx" ON "inventory_reservation"("status", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_reservation_item_variantId_idx" ON "inventory_reservation_item"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_reservation_item_reservationId_variantId_location_key" ON "inventory_reservation_item"("reservationId", "variantId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_trackingNumber_key" ON "shipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "shipment_orderId_idx" ON "shipment"("orderId");

-- CreateIndex
CREATE INDEX "return_request_userId_createdAt_idx" ON "return_request"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "return_request_orderId_idx" ON "return_request"("orderId");

-- CreateIndex
CREATE INDEX "return_request_status_createdAt_idx" ON "return_request"("status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "return_item_returnRequestId_orderItemId_key" ON "return_item"("returnRequestId", "orderItemId");

-- CreateIndex
CREATE INDEX "return_status_history_returnRequestId_createdAt_idx" ON "return_status_history"("returnRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_userId_createdAt_idx" ON "notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "notification_userId_dedupeKey_key" ON "notification"("userId", "dedupeKey");

-- CreateIndex
CREATE INDEX "notification_delivery_notificationId_idx" ON "notification_delivery"("notificationId");

-- CreateIndex
CREATE INDEX "contact_message_status_createdAt_idx" ON "contact_message"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "contact_message_email_createdAt_idx" ON "contact_message"("email", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscription_email_key" ON "newsletter_subscription"("email");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscription_unsubscribeTokenHash_key" ON "newsletter_subscription"("unsubscribeTokenHash");

-- CreateIndex
CREATE INDEX "newsletter_subscription_status_createdAt_idx" ON "newsletter_subscription"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_event" ADD CONSTRAINT "consent_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart" ADD CONSTRAINT "cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_item" ADD CONSTRAINT "wishlist_item_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon" ADD CONSTRAINT "coupon_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemption" ADD CONSTRAINT "coupon_redemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "customer_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_order" ADD CONSTRAINT "customer_order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_address" ADD CONSTRAINT "order_address_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "customer_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "customer_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "customer_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "customer_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation" ADD CONSTRAINT "inventory_reservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "customer_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation_item" ADD CONSTRAINT "inventory_reservation_item_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "inventory_reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation_item" ADD CONSTRAINT "inventory_reservation_item_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservation_item" ADD CONSTRAINT "inventory_reservation_item_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "inventory_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "customer_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_request" ADD CONSTRAINT "return_request_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "customer_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_request" ADD CONSTRAINT "return_request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_item" ADD CONSTRAINT "return_item_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "return_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_item" ADD CONSTRAINT "return_item_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_status_history" ADD CONSTRAINT "return_status_history_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "return_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_delivery" ADD CONSTRAINT "notification_delivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_message" ADD CONSTRAINT "contact_message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_subscription" ADD CONSTRAINT "newsletter_subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial unique: one default address per user+type among non-deleted
CREATE UNIQUE INDEX "address_one_default_per_user_type"
  ON "address" ("userId", "type")
  WHERE "isDefault" = true AND "deletedAt" IS NULL;

-- Cart XOR: exactly one of userId / guestTokenHash
ALTER TABLE "cart"
  ADD CONSTRAINT "cart_owner_xor_check"
  CHECK (
    ("userId" IS NOT NULL AND "guestTokenHash" IS NULL)
    OR ("userId" IS NULL AND "guestTokenHash" IS NOT NULL)
  );

ALTER TABLE "cart_item"
  ADD CONSTRAINT "cart_item_quantity_positive"
  CHECK ("quantity" > 0);

-- Coupon code stored uppercase
ALTER TABLE "coupon"
  ADD CONSTRAINT "coupon_code_uppercase"
  CHECK ("code" = upper("code"));

ALTER TABLE "promotion"
  ADD CONSTRAINT "promotion_reward_fields_check"
  CHECK (
    ("rewardType" = 'PERCENT_OFF' AND "percentOff" IS NOT NULL AND "percentOff" BETWEEN 1 AND 100 AND "fixedOffPoisha" IS NULL)
    OR ("rewardType" = 'FIXED_OFF' AND "fixedOffPoisha" IS NOT NULL AND "fixedOffPoisha" > 0 AND "percentOff" IS NULL)
    OR ("rewardType" = 'FREE_SHIPPING' AND "percentOff" IS NULL AND "fixedOffPoisha" IS NULL)
  );

-- Order money arithmetic
ALTER TABLE "customer_order"
  ADD CONSTRAINT "customer_order_money_nonneg"
  CHECK (
    "subtotalPoisha" >= 0
    AND "shippingPoisha" >= 0
    AND "discountPoisha" >= 0
    AND "totalPoisha" >= 0
    AND "totalPoisha" = "subtotalPoisha" - "discountPoisha" + "shippingPoisha"
  );

ALTER TABLE "order_item"
  ADD CONSTRAINT "order_item_qty_price_check"
  CHECK ("quantity" > 0 AND "unitPricePoisha" >= 0);

ALTER TABLE "payment"
  ADD CONSTRAINT "payment_amount_nonneg"
  CHECK ("amountPoisha" >= 0);

ALTER TABLE "inventory_reservation_item"
  ADD CONSTRAINT "reservation_item_qty_positive"
  CHECK ("quantity" > 0);

ALTER TABLE "return_item"
  ADD CONSTRAINT "return_item_qty_positive"
  CHECK ("quantity" > 0);

-- Unread notifications partial index
CREATE INDEX "notification_unread_by_user"
  ON "notification" ("userId", "createdAt" DESC)
  WHERE "readAt" IS NULL;

-- Notification href must be relative path when present
ALTER TABLE "notification"
  ADD CONSTRAINT "notification_href_relative"
  CHECK ("href" IS NULL OR ("href" LIKE '/%' AND "href" NOT LIKE '//%'));
