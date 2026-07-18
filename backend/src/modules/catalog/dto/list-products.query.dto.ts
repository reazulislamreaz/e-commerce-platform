import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const SORTS = ['featured', 'newest', 'price-asc', 'price-desc', 'rating', 'discount'] as const;
const AVAILABILITY = ['all', 'in-stock', 'out-of-stock'] as const;

export type ProductSort = (typeof SORTS)[number];
export type ProductAvailability = (typeof AVAILABILITY)[number];

function stringList(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const values = Array.isArray(value) ? value : String(value).split(',');
  return values.map(String).map((item) => item.trim()).filter(Boolean);
}

function optionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value as boolean;
}

export class ListProductsQueryDto {
  @ApiPropertyOptional({ type: [String], description: 'Collection slugs; comma-separated accepted' })
  @IsOptional()
  @Transform(({ value }) => stringList(value))
  @IsArray()
  @IsString({ each: true })
  collections?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Parent category names' })
  @IsOptional()
  @Transform(({ value }) => stringList(value))
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Leaf subcategory names' })
  @IsOptional()
  @Transform(({ value }) => stringList(value))
  @IsArray()
  @IsString({ each: true })
  subcategories?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Brand names' })
  @IsOptional()
  @Transform(({ value }) => stringList(value))
  @IsArray()
  @IsString({ each: true })
  brands?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => stringList(value))
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => stringList(value))
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiPropertyOptional({ minimum: 0, description: 'Minimum selling price in taka (inclusive)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'Maximum selling price in taka (inclusive)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: AVAILABILITY, default: 'all' })
  @IsOptional()
  @IsIn(AVAILABILITY)
  availability: ProductAvailability = 'all';

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => optionalBoolean(value))
  discount?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;

  @ApiPropertyOptional({ enum: SORTS, default: 'featured' })
  @IsOptional()
  @IsIn(SORTS)
  sort: ProductSort = 'featured';

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 8, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 8;
}

export class ProductLimitQueryDto {
  @ApiPropertyOptional({ default: 8, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 8;
}

export class ProductSearchQueryDto extends ProductLimitQueryDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  q!: string;
}

export class ProductIdsQueryDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Product UUIDs or legacy fixture keys; comma-separated accepted',
  })
  @Transform(({ value }) => stringList(value))
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];
}
