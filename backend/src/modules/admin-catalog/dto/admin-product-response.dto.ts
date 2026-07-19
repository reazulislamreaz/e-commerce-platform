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

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  publishedAt?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
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
