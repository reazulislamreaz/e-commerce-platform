-- CreateTable
CREATE TABLE "delivery_partner" (
    "id" UUID NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "trackingUrlTemplate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "delivery_partner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_partner_isActive_companyName_idx" ON "delivery_partner"("isActive", "companyName");

-- AlterTable
ALTER TABLE "shipment"
    ADD COLUMN "deliveryPartnerId" UUID,
    ADD COLUMN "assignedById" UUID,
    ADD COLUMN "assignedAt" TIMESTAMPTZ(3),
    ADD COLUMN "trackingUrl" TEXT,
    ADD COLUMN "shippingNote" TEXT,
    ADD COLUMN "estimatedDeliveryAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "shipment_deliveryPartnerId_idx" ON "shipment"("deliveryPartnerId");

-- AddForeignKey
ALTER TABLE "shipment"
    ADD CONSTRAINT "shipment_deliveryPartnerId_fkey"
    FOREIGN KEY ("deliveryPartnerId") REFERENCES "delivery_partner"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shipment"
    ADD CONSTRAINT "shipment_assignedById_fkey"
    FOREIGN KEY ("assignedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Order status history actor relation
CREATE INDEX IF NOT EXISTS "order_status_history_actorId_idx" ON "order_status_history"("actorId");

ALTER TABLE "order_status_history"
    ADD CONSTRAINT "order_status_history_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Order list indexes for OMS filters/sort
CREATE INDEX IF NOT EXISTS "customer_order_phone_createdAt_idx" ON "customer_order"("phone", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "customer_order_updatedAt_idx" ON "customer_order"("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "customer_order_totalPoisha_idx" ON "customer_order"("totalPoisha" DESC);
