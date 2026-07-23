-- CreateIndex
CREATE INDEX "abandoned_cart_recovery_userId_idx" ON "abandoned_cart_recovery"("userId");

-- CreateIndex
CREATE INDEX "contact_message_userId_createdAt_idx" ON "contact_message"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "customer_order_userId_status_createdAt_idx" ON "customer_order"("userId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "inventory_reservation_item_locationId_idx" ON "inventory_reservation_item"("locationId");

-- CreateIndex
CREATE INDEX "newsletter_subscription_userId_idx" ON "newsletter_subscription"("userId");

-- CreateIndex
CREATE INDEX "return_item_variantId_idx" ON "return_item"("variantId");

-- CreateIndex
CREATE INDEX "verification_token_expiresAt_idx" ON "verification_token"("expiresAt");
