import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@/generated/prisma/client';

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function normalizeEnum(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim().toUpperCase();
}

export enum AdminOrderSort {
  CREATED_DESC = 'CREATED_DESC',
  CREATED_ASC = 'CREATED_ASC',
  TOTAL_DESC = 'TOTAL_DESC',
  TOTAL_ASC = 'TOTAL_ASC',
  UPDATED_DESC = 'UPDATED_DESC',
}

export class AdminListOrdersQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Alias for limit' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Search order number, email, phone, or customer name' })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(32)
  number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || undefined : value,
  )
  @IsString()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @Transform(({ value }) => normalizeEnum(value))
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @Transform(({ value }) => normalizeEnum(value))
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @Transform(({ value }) => normalizeEnum(value))
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  deliveryPartnerId?: string;

  @ApiPropertyOptional({ description: 'ISO date (inclusive start)' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'ISO date (inclusive end)' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({ enum: AdminOrderSort, default: AdminOrderSort.CREATED_DESC })
  @IsOptional()
  @Transform(({ value }) => normalizeEnum(value))
  @IsEnum(AdminOrderSort)
  sort: AdminOrderSort = AdminOrderSort.CREATED_DESC;
}
