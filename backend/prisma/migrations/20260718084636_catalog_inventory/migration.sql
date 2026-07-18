-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('OPENING', 'ADJUSTMENT', 'SALE', 'RETURN');

-- CreateTable
CREATE TABLE "brand" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" UUID NOT NULL,
    "parentId" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_collection" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "catalog_collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "legacyKey" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "primaryColor" TEXT NOT NULL,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "onSale" BOOLEAN NOT NULL DEFAULT false,
    "featuredPosition" INTEGER NOT NULL DEFAULT 0,
    "ratingAverage" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMPTZ(3),
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_category" (
    "productId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_category_pkey" PRIMARY KEY ("productId","categoryId")
);

-- CreateTable
CREATE TABLE "product_collection" (
    "productId" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_collection_pkey" PRIMARY KEY ("productId","collectionId")
);

-- CreateTable
CREATE TABLE "product_color" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "hex" VARCHAR(7) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variant" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_price" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'BDT',
    "amount" BIGINT NOT NULL,
    "compareAtAmount" BIGINT,
    "validFrom" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_location" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "inventory_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_balance" (
    "id" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "onHand" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "inventory_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movement" (
    "id" BIGSERIAL NOT NULL,
    "variantId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_review" (
    "id" UUID NOT NULL,
    "sourceKey" TEXT,
    "productId" UUID NOT NULL,
    "userId" UUID,
    "authorName" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "publishedAt" TIMESTAMPTZ(3),
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_slug_key" ON "brand"("slug");

-- CreateIndex
CREATE INDEX "brand_name_idx" ON "brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE INDEX "category_parentId_position_idx" ON "category"("parentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_collection_slug_key" ON "catalog_collection"("slug");

-- CreateIndex
CREATE INDEX "catalog_collection_position_idx" ON "catalog_collection"("position");

-- CreateIndex
CREATE UNIQUE INDEX "product_legacyKey_key" ON "product"("legacyKey");

-- CreateIndex
CREATE UNIQUE INDEX "product_slug_key" ON "product"("slug");

-- CreateIndex
CREATE INDEX "product_status_featuredPosition_idx" ON "product"("status", "featuredPosition");

-- CreateIndex
CREATE INDEX "product_status_isNew_publishedAt_idx" ON "product"("status", "isNew", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "product_status_onSale_idx" ON "product"("status", "onSale");

-- CreateIndex
CREATE INDEX "product_brandId_status_idx" ON "product"("brandId", "status");

-- CreateIndex
CREATE INDEX "product_ratingAverage_idx" ON "product"("ratingAverage");

-- CreateIndex
CREATE INDEX "product_category_categoryId_productId_idx" ON "product_category"("categoryId", "productId");

-- CreateIndex
CREATE INDEX "product_collection_collectionId_productId_idx" ON "product_collection"("collectionId", "productId");

-- CreateIndex
CREATE INDEX "product_color_productId_position_idx" ON "product_color"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "product_color_productId_name_key" ON "product_color"("productId", "name");

-- CreateIndex
CREATE INDEX "product_media_productId_isPrimary_idx" ON "product_media"("productId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "product_media_productId_position_key" ON "product_media"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_sku_key" ON "product_variant"("sku");

-- CreateIndex
CREATE INDEX "product_variant_productId_isActive_position_idx" ON "product_variant"("productId", "isActive", "position");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_productId_size_color_key" ON "product_variant"("productId", "size", "color");

-- CreateIndex
CREATE INDEX "product_price_productId_validFrom_idx" ON "product_price"("productId", "validFrom" DESC);

-- CreateIndex
CREATE INDEX "product_price_validTo_idx" ON "product_price"("validTo");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_location_code_key" ON "inventory_location"("code");

-- CreateIndex
CREATE INDEX "inventory_balance_locationId_variantId_idx" ON "inventory_balance"("locationId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_balance_variantId_locationId_key" ON "inventory_balance"("variantId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_movement_idempotencyKey_key" ON "inventory_movement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "inventory_movement_variantId_createdAt_idx" ON "inventory_movement"("variantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "inventory_movement_locationId_createdAt_idx" ON "inventory_movement"("locationId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "product_review_sourceKey_key" ON "product_review"("sourceKey");

-- CreateIndex
CREATE INDEX "product_review_productId_status_createdAt_idx" ON "product_review"("productId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "product_review_userId_createdAt_idx" ON "product_review"("userId", "createdAt" DESC);

-- PostgreSQL constraints and indexes Prisma cannot express.
ALTER TABLE "product"
  ADD CONSTRAINT "product_rating_average_check"
    CHECK ("ratingAverage" >= 0 AND "ratingAverage" <= 500),
  ADD CONSTRAINT "product_review_count_check"
    CHECK ("reviewCount" >= 0),
  ADD CONSTRAINT "product_featured_position_check"
    CHECK ("featuredPosition" >= 0);

ALTER TABLE "product_color"
  ADD CONSTRAINT "product_color_hex_check"
    CHECK ("hex" ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE "product_price"
  ADD CONSTRAINT "product_price_amount_check"
    CHECK ("amount" >= 0),
  ADD CONSTRAINT "product_price_compare_at_check"
    CHECK ("compareAtAmount" IS NULL OR "compareAtAmount" > "amount"),
  ADD CONSTRAINT "product_price_window_check"
    CHECK ("validTo" IS NULL OR "validTo" > "validFrom");

CREATE UNIQUE INDEX "product_price_one_active_per_product"
  ON "product_price" ("productId")
  WHERE "validTo" IS NULL;

CREATE UNIQUE INDEX "product_one_primary_category"
  ON "product_category" ("productId")
  WHERE "isPrimary" = true;

CREATE UNIQUE INDEX "product_one_primary_collection"
  ON "product_collection" ("productId")
  WHERE "isPrimary" = true;

CREATE UNIQUE INDEX "product_one_primary_media"
  ON "product_media" ("productId")
  WHERE "isPrimary" = true;

ALTER TABLE "inventory_balance"
  ADD CONSTRAINT "inventory_balance_on_hand_check"
    CHECK ("onHand" >= 0),
  ADD CONSTRAINT "inventory_balance_reserved_check"
    CHECK ("reserved" >= 0 AND "reserved" <= "onHand"),
  ADD CONSTRAINT "inventory_balance_version_check"
    CHECK ("version" >= 0);

ALTER TABLE "inventory_movement"
  ADD CONSTRAINT "inventory_movement_quantity_check"
    CHECK ("quantity" <> 0),
  ADD CONSTRAINT "inventory_movement_balance_after_check"
    CHECK ("balanceAfter" >= 0);

ALTER TABLE "product_review"
  ADD CONSTRAINT "product_review_rating_check"
    CHECK ("rating" BETWEEN 1 AND 5);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "product_search_trgm_idx"
  ON "product"
  USING GIN ((coalesce("name", '') || ' ' || coalesce("description", '') || ' ' || coalesce("primaryColor", '')) gin_trgm_ops)
  WHERE "status" = 'ACTIVE' AND "deletedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_collection" ADD CONSTRAINT "product_collection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_collection" ADD CONSTRAINT "product_collection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "catalog_collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_color" ADD CONSTRAINT "product_color_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price" ADD CONSTRAINT "product_price_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_balance" ADD CONSTRAINT "inventory_balance_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_balance" ADD CONSTRAINT "inventory_balance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "inventory_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "inventory_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review" ADD CONSTRAINT "product_review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review" ADD CONSTRAINT "product_review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
