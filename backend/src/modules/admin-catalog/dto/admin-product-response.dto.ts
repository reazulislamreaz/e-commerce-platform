import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@/generated/prisma/client';

export class AdminProductVariantResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  sku!: string;

  @ApiProperty()
  size!: string;

  @ApiProperty()
  color!: string;

  @ApiProperty()
  position!: number;

  @ApiProperty()
  isActive!: boolean;
}

export class AdminProductMediaResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  alt!: string;

  @ApiProperty()
  position!: number;

  @ApiProperty()
  isPrimary!: boolean;
}

export class AdminProductColorResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  hex!: string;

  @ApiProperty()
  position!: number;
}

export class AdminProductPriceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Amount in taka' })
  amountTaka!: number;

  @ApiPropertyOptional({ description: 'Compare-at amount in taka' })
  compareAtTaka?: number;

  @ApiProperty({ type: String, format: 'date-time' })
  validFrom!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  validTo?: string;
}

export class AdminProductSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ProductStatus })
  status!: ProductStatus;

  @ApiProperty()
  brandName!: string;

  @ApiProperty({ description: 'Current price in taka' })
  priceTaka!: number;

  @ApiProperty()
  variantCount!: number;

  @ApiPropertyOptional({ description: 'Primary media URL' })
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'First variant SKU' })
  sku?: string;

  @ApiPropertyOptional({ description: 'Primary category name' })
  categoryName?: string;

  @ApiPropertyOptional({
    description: 'Aggregate available stock across variants (list responses only)',
  })
  totalStock?: number;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  publishedAt?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class AdminProductStatsResponseDto {
  @ApiProperty({ description: 'All non-deleted products' })
  total!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  draft!: number;

  @ApiProperty()
  archived!: number;

  @ApiProperty({ description: 'Non-archived products with no available stock' })
  outOfStock!: number;

  @ApiProperty({ description: 'Non-archived products at or below their low-stock threshold' })
  lowStock!: number;
}

export class AdminProductDetailResponseDto extends AdminProductSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  brandId!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  primaryColor!: string;

  @ApiProperty({ type: [String] })
  categoryIds!: string[];

  @ApiProperty({ type: [String] })
  collectionIds!: string[];

  @ApiProperty({ type: [AdminProductColorResponseDto] })
  colors!: AdminProductColorResponseDto[];

  @ApiProperty({ type: [AdminProductVariantResponseDto] })
  variants!: AdminProductVariantResponseDto[];

  @ApiProperty({ type: [AdminProductMediaResponseDto] })
  media!: AdminProductMediaResponseDto[];

  @ApiPropertyOptional({ type: AdminProductPriceResponseDto })
  activePrice?: AdminProductPriceResponseDto;

  @ApiProperty()
  isNew!: boolean;

  @ApiProperty()
  featuredPosition!: number;

  @ApiProperty()
  onSale!: boolean;

  @ApiProperty()
  discountPercent!: number;
}
