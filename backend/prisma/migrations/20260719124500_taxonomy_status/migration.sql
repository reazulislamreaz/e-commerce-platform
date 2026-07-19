ALTER TABLE "brand"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "category"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "catalog_collection"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "brand_isActive_name_idx" ON "brand"("isActive", "name");
CREATE INDEX "category_isActive_position_name_idx"
ON "category"("isActive", "position", "name");
CREATE INDEX "catalog_collection_isActive_position_name_idx"
ON "catalog_collection"("isActive", "position", "name");
