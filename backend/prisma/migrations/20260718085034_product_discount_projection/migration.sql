-- AlterTable
ALTER TABLE "product" ADD COLUMN     "discountPercent" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "product_status_discountPercent_idx" ON "product"("status", "discountPercent");
