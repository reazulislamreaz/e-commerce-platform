import { ApiProperty } from '@nestjs/swagger';

export class CouponResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ELEVATE10' })
  code!: string;

  @ApiProperty({ example: '10% off your first order' })
  title!: string;

  @ApiProperty({ example: 'Valid on orders over ৳1500. One-time use.' })
  description!: string;

  @ApiProperty({ enum: ['percent', 'fixed', 'free_shipping'] })
  discountType!: 'percent' | 'fixed' | 'free_shipping';

  @ApiProperty({
    description: 'Percent off or fixed discount amount in taka; 0 for free-shipping coupons',
    example: 10,
  })
  value!: number;

  @ApiProperty({ example: 1500, description: 'Minimum order subtotal in taka' })
  minOrder!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-12-31T23:59:59.000Z',
  })
  expiresAt!: string;

  @ApiProperty({ description: 'True when the signed-in user has exhausted this coupon' })
  used!: boolean;
}
