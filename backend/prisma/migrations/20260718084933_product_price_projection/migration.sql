-- AlterTable
ALTER TABLE "product" ADD COLUMN     "currencyCode" CHAR(3) NOT NULL DEFAULT 'BDT',
ADD COLUMN     "currentCompareAtAmount" BIGINT,
ADD COLUMN     "currentPriceAmount" BIGINT NOT NULL DEFAULT 0;

UPDATE "product" AS p
SET
  "currentPriceAmount" = pp."amount",
  "currentCompareAtAmount" = pp."compareAtAmount",
  "currencyCode" = pp."currencyCode"
FROM "product_price" AS pp
WHERE pp."productId" = p."id"
  AND pp."validTo" IS NULL;

ALTER TABLE "product"
  ADD CONSTRAINT "product_current_price_amount_check"
    CHECK ("currentPriceAmount" >= 0),
  ADD CONSTRAINT "product_current_compare_at_check"
    CHECK ("currentCompareAtAmount" IS NULL OR "currentCompareAtAmount" > "currentPriceAmount");

-- CreateIndex
CREATE INDEX "product_status_currentPriceAmount_idx" ON "product"("status", "currentPriceAmount");
