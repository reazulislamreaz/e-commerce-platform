import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class AdminSetTrackingDto {
  @ApiProperty({ example: 'TRK1A2B3C4D5E', minLength: 4, maxLength: 40 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(4)
  @MaxLength(40)
  trackingNumber!: string;

  @ApiPropertyOptional({ example: 'Pathao', maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(80)
  carrier?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  deliveryPartnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(500)
  trackingUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(500)
  shippingNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  estimatedDeliveryAt?: string;
}
