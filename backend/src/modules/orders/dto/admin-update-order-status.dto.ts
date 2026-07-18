import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { OrderStatus } from '@/generated/prisma/client';

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeOrderStatus(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim().toUpperCase();
}

export class AdminUpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PROCESSING })
  @Transform(({ value }) => normalizeOrderStatus(value))
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? trim(value) : value))
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({
    description: 'Required when moving to SHIPPED if no shipment exists yet',
    example: 'TRK1A2B3C4D5E',
  })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(4)
  @MaxLength(40)
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 'Pathao', maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? trim(value) : value))
  @IsString()
  @MaxLength(80)
  carrier?: string;
}
