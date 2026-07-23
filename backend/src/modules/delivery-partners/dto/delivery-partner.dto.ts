import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class ListDeliveryPartnersQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Search company name, contact, phone, email' })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;
}

export class CreateDeliveryPartnerDto {
  @ApiProperty({ example: 'Pathao Courier' })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(120)
  companyName!: string;

  @ApiPropertyOptional({ example: 'Pathao Support' })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(120)
  contactPerson?: string;

  @ApiPropertyOptional({ example: '+8809610010101' })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ example: 'courier@supports.pathao.com' })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({ example: 'https://pathao.com' })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsUrl({ require_protocol: true })
  @MaxLength(1000)
  logoUrl?: string;

  @ApiPropertyOptional({
    example: 'https://pathao.com/track/{trackingNumber}',
    description: 'Use {trackingNumber} placeholder when supported',
  })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(500)
  trackingUrlTemplate?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDeliveryPartnerDto extends PartialType(CreateDeliveryPartnerDto) {}

export class DeliveryPartnerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  companyName!: string;

  @ApiPropertyOptional()
  contactPerson?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  website?: string | null;

  @ApiPropertyOptional()
  logoUrl?: string | null;

  @ApiPropertyOptional()
  trackingUrlTemplate?: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ description: 'Number of shipments referencing this partner' })
  shipmentCount?: number;
}
