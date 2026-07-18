import { ApiProperty } from '@nestjs/swagger';

export class ValidateCouponResponseDto {
  @ApiProperty({ example: 'ELEVATE10' })
  code!: string;

  @ApiProperty({
    example: 200,
    description: 'Item discount in whole taka; always 0 for free-shipping coupons',
  })
  discount!: number;

  @ApiProperty({
    example: false,
    description: 'True when the coupon waives standard shipping instead of an item discount',
  })
  shippingWaived!: boolean;

  @ApiProperty({ example: '10% off your first order' })
  title!: string;
}
