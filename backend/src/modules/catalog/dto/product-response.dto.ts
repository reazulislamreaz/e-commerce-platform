import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductColorDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ example: '#111111' })
  hex!: string;
}

export class ProductVariantDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  size!: string;

  @ApiProperty()
  color!: string;

  @ApiProperty({ minimum: 0, description: 'Available stock: on-hand minus reserved' })
  stock!: number;

  @ApiProperty()
  sku!: string;
}

export class ProductReviewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  author!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  rating!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ example: '2026-05-12' })
  createdAt!: string;

  @ApiProperty()
  verified!: boolean;
}

export class ProductResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ description: 'Temporary migration key for pre-API browser state' })
  legacyId?: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ example: 1190, description: 'Selling price in taka; stored as BIGINT poisha' })
  price!: number;

  @ApiPropertyOptional({ example: 1490 })
  compareAtPrice?: number;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  subcategory!: string;

  @ApiProperty()
  brand!: string;

  @ApiProperty({ enum: ['men', 'women', 'unisex'] })
  collection!: 'men' | 'women' | 'unisex';

  @ApiProperty()
  color!: string;

  @ApiProperty({ type: [ProductColorDto] })
  colors!: ProductColorDto[];

  @ApiProperty({ type: [String] })
  sizes!: string[];

  @ApiProperty()
  image!: string;

  @ApiProperty({ type: [String] })
  images!: string[];

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: [ProductVariantDto] })
  variants!: ProductVariantDto[];

  @ApiProperty()
  inStock!: boolean;

  @ApiProperty({ minimum: 0, maximum: 5 })
  rating!: number;

  @ApiProperty({ minimum: 0 })
  reviewCount!: number;

  @ApiProperty({ type: [ProductReviewDto] })
  reviews!: ProductReviewDto[];

  @ApiProperty()
  isNew!: boolean;

  @ApiProperty()
  onSale!: boolean;
}

export class ProductFacetsResponseDto {
  @ApiProperty({ type: [String] })
  categories!: string[];

  @ApiProperty({ type: [String] })
  subcategories!: string[];

  @ApiProperty({ type: [String] })
  brands!: string[];

  @ApiProperty({ type: [String] })
  sizes!: string[];

  @ApiProperty({ type: [String] })
  colors!: string[];

  @ApiProperty({ example: 990 })
  minPrice!: number;

  @ApiProperty({ example: 1990 })
  maxPrice!: number;
}
