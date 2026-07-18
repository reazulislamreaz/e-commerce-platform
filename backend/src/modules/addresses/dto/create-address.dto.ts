import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateAddressDto {
  @ApiProperty({ example: 'Home', minLength: 1, maxLength: 40 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label!: string;

  @ApiProperty({ example: 'Rahim Khan', minLength: 2, maxLength: 80 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName!: string;

  @ApiProperty({
    description: 'Bangladeshi mobile; normalized to E.164 when valid, otherwise stored trimmed',
    example: '01712345678',
    minLength: 10,
    maxLength: 20,
  })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: 'House 12, Road 4', minLength: 3, maxLength: 120 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  line1!: string;

  @ApiPropertyOptional({ example: 'Block B, Lift 3', maxLength: 120 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? trim(value) : value))
  @IsString()
  @MaxLength(120)
  line2?: string;

  @ApiProperty({ example: 'Dhaka', minLength: 2, maxLength: 80 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city!: string;

  @ApiProperty({ example: 'Dhaka', minLength: 2, maxLength: 80 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  district!: string;

  @ApiProperty({ example: '1207', minLength: 3, maxLength: 20 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  postalCode!: string;

  @ApiPropertyOptional({
    enum: AddressType,
    default: AddressType.SHIPPING,
    description: 'Accepts SHIPPING/BILLING or shipping/billing',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeAddressType(value))
  @IsEnum(AddressType)
  type?: AddressType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
