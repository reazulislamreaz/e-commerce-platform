import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderTimelineStepDto {
  @ApiProperty({ example: 'Order placed' })
  label!: string;

  @ApiProperty({ example: '2026-07-18T10:00:00.000Z' })
  at!: string;

  @ApiProperty({ example: true })
  done!: boolean;
}

export class OrderLineItemDto {
  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ example: 'Essential Oversized Tee' })
  name!: string;

  @ApiProperty({ example: 'essential-oversized-tee' })
  slug!: string;

  @ApiProperty({ example: 'https://cdn.example.com/tee.webp' })
  image!: string;

  @ApiProperty({ example: 'M' })
  size!: string;

  @ApiProperty({ example: 'Black' })
  color!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ description: 'Unit price in integer taka', example: 1499 })
  unitPrice!: number;
}

export class OrderShippingAddressDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Shipping' })
  label!: string;

  @ApiProperty({ example: 'Rahim Khan' })
  fullName!: string;

  @ApiProperty({ example: '+8801712345678' })
  phone!: string;

  @ApiProperty({ example: 'House 12, Road 4' })
  line1!: string;

  @ApiPropertyOptional({ example: 'Block B' })
  line2?: string;

  @ApiProperty({ example: 'Dhaka' })
  city!: string;

  @ApiProperty({ example: 'Dhaka' })
  district!: string;

  @ApiProperty({ example: '1207' })
  postalCode!: string;

  @ApiProperty({ example: 'Bangladesh' })
  country!: string;

  @ApiProperty({ example: false })
  isDefault!: boolean;

  @ApiProperty({ enum: ['shipping', 'billing'], example: 'shipping' })
  type!: 'shipping' | 'billing';
}

export class OrderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'EA1A2B3C4D' })
  number!: string;

  @ApiProperty({ example: '2026-07-18T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    example: 'confirmed',
  })
  status!: string;

  @ApiProperty({ type: [OrderLineItemDto] })
  items!: OrderLineItemDto[];

  @ApiProperty({ description: 'Subtotal in integer taka', example: 2998 })
  subtotal!: number;

  @ApiProperty({ description: 'Shipping in integer taka', example: 120 })
  shipping!: number;

  @ApiProperty({ description: 'Discount in integer taka', example: 0 })
  discount!: number;

  @ApiProperty({ description: 'Total in integer taka', example: 3118 })
  total!: number;

  @ApiPropertyOptional({ example: 'ELEVATE10' })
  couponCode?: string;

  @ApiProperty({ type: OrderShippingAddressDto })
  shippingAddress!: OrderShippingAddressDto;

  @ApiProperty({ enum: ['cod'], example: 'cod' })
  paymentMethod!: 'cod';

  @ApiPropertyOptional({ example: 'TRK1A2B3C4D5E' })
  trackingNumber?: string;

  @ApiProperty({ type: [OrderTimelineStepDto] })
  timeline!: OrderTimelineStepDto[];
}
