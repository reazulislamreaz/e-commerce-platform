-- One active authenticated review per user/product.
CREATE UNIQUE INDEX "product_review_user_product_active_key"
  ON "product_review"("userId", "productId")
  WHERE "userId" IS NOT NULL AND "deletedAt" IS NULL;

-- Speed delivered-purchase eligibility checks by product.
CREATE INDEX "order_item_productId_idx" ON "order_item"("productId");
