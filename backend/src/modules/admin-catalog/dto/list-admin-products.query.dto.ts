import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { ProductStatus } from '@/generated/prisma/client';

export enum AdminProductSort {
  UPDATED_DESC = 'UPDATED_DESC',
  CREATED_DESC = 'CREATED_DESC',
  CREATED_ASC = 'CREATED_ASC',
  NAME_ASC = 'NAME_ASC',
  NAME_DESC = 'NAME_DESC',
  PRICE_ASC = 'PRICE_ASC',
  PRICE_DESC = 'PRICE_DESC',
}

export enum AdminStockFilter {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export class ListAdminProductsQueryDto {
  @ApiPropertyOptional({ description: 'Cursor: id of the last item from the previous page' })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ description: 'Search name, slug, description, brand, or variant SKU' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  q?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by brand' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    enum: AdminStockFilter,
    description: 'Filter by aggregate available stock across active variants',
  })
  @IsOptional()
  @IsEnum(AdminStockFilter)
  stock?: AdminStockFilter;

  @ApiPropertyOptional({ enum: AdminProductSort, default: AdminProductSort.UPDATED_DESC })
  @IsOptional()
  @IsEnum(AdminProductSort)
  sort?: AdminProductSort;
}
