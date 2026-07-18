import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PromotionStatus } from '@/generated/prisma/client';

export class CreateAdminCouponDto {
  @ApiProperty({ example: 'ELEVATE10' })
  @IsString()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: '10% off your first order' })
  @IsString()
  @MaxLength(160)
  title!: string;

  @ApiProperty({ example: 'Valid on orders over ৳1500. One-time use.' })
  @IsString()
  @MaxLength(1000)
  description!: string;

  @ApiProperty({ enum: ['percent', 'fixed', 'free_shipping'] })
  @IsEnum(['percent', 'fixed', 'free_shipping'] as const)
  rewardType!: 'percent' | 'fixed' | 'free_shipping';

  @ApiPropertyOptional({
    description: 'Percent off or fixed discount in taka; omit for free shipping',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number;

  @ApiProperty({ example: 1500, description: 'Minimum order subtotal in taka' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderTaka!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  startsAt!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRedemptionsPerUser?: number;
}

export class UpdateAdminCouponDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: ['percent', 'fixed', 'free_shipping'] })
  @IsOptional()
  @IsEnum(['percent', 'fixed', 'free_shipping'] as const)
  rewardType?: 'percent' | 'fixed' | 'free_shipping';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderTaka?: number;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRedemptionsPerUser?: number;
}

export class AdminCouponResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: ['percent', 'fixed', 'free_shipping'] })
  rewardType!: 'percent' | 'fixed' | 'free_shipping';

  @ApiProperty()
  value!: number;

  @ApiProperty()
  minOrderTaka!: number;

  @ApiProperty({ enum: PromotionStatus })
  status!: PromotionStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  startsAt!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  endsAt?: string | null;

  @ApiProperty()
  maxRedemptionsPerUser!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class AdminCouponRedemptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  userId?: string | null;

  @ApiProperty({ description: 'Discount applied in taka' })
  discountTaka!: number;

  @ApiProperty()
  shippingWaived!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}

export class ListAdminCouponRedemptionsQueryDto {
  @ApiPropertyOptional({ description: 'Cursor: redemption id from the previous page' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
