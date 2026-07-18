import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AddressType } from '@/generated/prisma/client';

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeAddressType(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const upper = value.trim().toUpperCase();
  if (upper === 'SHIPPING' || upper === 'BILLING') return upper;
  return value;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({ example: 'Office', minLength: 1, maxLength: 40 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label?: string;

  @ApiPropertyOptional({ example: 'Rahim Khan', minLength: 2, maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Bangladeshi mobile; normalized to E.164 when valid, otherwise stored trimmed',
    example: '01712345678',
    minLength: 10,
    maxLength: 20,
  })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'House 12, Road 4', minLength: 3, maxLength: 120 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  line1?: string;

  @ApiPropertyOptional({ example: 'Block B, Lift 3', maxLength: 120, nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === null ? null : trim(value)))
  @IsString()
  @MaxLength(120)
  line2?: string | null;

  @ApiPropertyOptional({ example: 'Dhaka', minLength: 2, maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ example: 'Dhaka', minLength: 2, maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  district?: string;

  @ApiPropertyOptional({ example: '1207', minLength: 3, maxLength: 20 })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({
    enum: AddressType,
    description: 'Accepts SHIPPING/BILLING or shipping/billing',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeAddressType(value))
  @IsEnum(AddressType)
  type?: AddressType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
