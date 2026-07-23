import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ProductStatus } from '@/generated/prisma/client';
import { OffsetPaginationQueryDto } from '@/common/pagination/offset-pagination.query.dto';

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

export class ListAdminProductsQueryDto extends OffsetPaginationQueryDto {
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
