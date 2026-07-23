import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderTimelineStepDto {
  @ApiProperty({ example: 'Order placed' })
  label!: string;

  @ApiProperty({ example: '2026-07-18T10:00:00.000Z' })
  at!: string;

  @ApiProperty({ example: true })
  done!: boolean;
}

export class OrderStatusHistoryEntryDto {
  @ApiProperty({ example: 'shipped' })
  status!: string;

  @ApiPropertyOptional()
  note?: string | null;

  @ApiProperty({ example: '2026-07-18T10:00:00.000Z' })
  createdAt!: string;

  @ApiPropertyOptional({
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      fullName: { type: 'string' },
    },
  })
  actor?: { id: string; fullName: string } | null;
}

export class OrderLineItemDto {
  @ApiProperty({ format: 'uuid', description: 'Order line id for returns/exchanges' })
  orderItemId!: string;

  @ApiProperty({ format: 'uuid' })
  variantId!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ example: 'Essential Oversized Tee' })
  name!: string;

  @ApiProperty({ example: 'essential-oversized-tee' })
  slug!: string;

  @ApiProperty({ example: 'https://cdn.example.com/tee.webp' })
  image!: string;

  @ApiPropertyOptional({ example: 'EA-TEE-M-BLK' })
  sku?: string;

  @ApiProperty({ example: 'M' })
  size!: string;

  @ApiProperty({ example: 'Black' })
  color!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ description: 'Unit price in integer taka', example: 1499 })
  unitPrice!: number;

  @ApiProperty({ description: 'Line total in integer taka', example: 2998 })
  lineTotal!: number;
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

  @ApiProperty({ example: 'Dhaka', description: 'District / division' })
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

export class OrderShipmentDto {
  @ApiPropertyOptional({ format: 'uuid' })
  deliveryPartnerId?: string | null;

  @ApiPropertyOptional()
  deliveryPartnerName?: string | null;

  @ApiPropertyOptional()
  deliveryPartnerLogoUrl?: string | null;

  @ApiPropertyOptional()
  carrier?: string | null;

  @ApiPropertyOptional()
  trackingNumber?: string | null;

  @ApiPropertyOptional()
  trackingUrl?: string | null;

  @ApiPropertyOptional()
  shippingNote?: string | null;

  @ApiPropertyOptional()
  shippedAt?: string | null;

  @ApiPropertyOptional()
  assignedAt?: string | null;

  @ApiPropertyOptional()
  estimatedDeliveryAt?: string | null;

  @ApiPropertyOptional({
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      fullName: { type: 'string' },
    },
  })
  assignedBy?: { id: string; fullName: string } | null;
}

export class OrderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'EA1A2B3C4D' })
  number!: string;

  @ApiProperty({ example: '2026-07-18T10:00:00.000Z' })
  createdAt!: string;

  @ApiPropertyOptional({ example: '2026-07-18T12:00:00.000Z' })
  updatedAt?: string;

  @ApiProperty({
    enum: [
      'pending',
      'confirmed',
      'processing',
      'packed',
      'shipped',
      'delivered',
      'cancelled',
      'returned',
      'exchanged',
    ],
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

  @ApiPropertyOptional({ enum: ['pending', 'collected', 'cancelled'], example: 'pending' })
  paymentStatus?: string;

  @ApiPropertyOptional({ example: 'TRK1A2B3C4D5E' })
  trackingNumber?: string;

  @ApiPropertyOptional({ type: OrderShipmentDto })
  shipment?: OrderShipmentDto | null;

  @ApiProperty({ type: [OrderTimelineStepDto] })
  timeline!: OrderTimelineStepDto[];

  @ApiPropertyOptional({ type: [OrderStatusHistoryEntryDto] })
  statusHistory?: OrderStatusHistoryEntryDto[];

  @ApiPropertyOptional({
    example: 'customer@example.com',
    description: 'Present on admin order responses for fulfillment.',
  })
  email?: string;

  @ApiPropertyOptional({ example: '+8801712345678' })
  phone?: string;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional({ example: '2026-07-18T10:05:00.000Z' })
  confirmedAt?: string | null;

  @ApiPropertyOptional()
  processingAt?: string | null;

  @ApiPropertyOptional()
  packedAt?: string | null;

  @ApiPropertyOptional()
  shippedAt?: string | null;

  @ApiPropertyOptional()
  deliveredAt?: string | null;

  @ApiPropertyOptional()
  cancelledAt?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Present on admin order responses when the order belongs to a registered user.',
  })
  userId?: string;

  @ApiPropertyOptional({ description: 'Customer display name from address snapshot' })
  customerName?: string;
}

export class OrdersSummaryDto {
  @ApiProperty()
  totalOrders!: number;

  @ApiProperty()
  pending!: number;

  @ApiProperty()
  confirmed!: number;

  @ApiProperty()
  processing!: number;

  @ApiProperty()
  packed!: number;

  @ApiProperty()
  shipped!: number;

  @ApiProperty()
  delivered!: number;

  @ApiProperty()
  cancelled!: number;

  @ApiProperty()
  returned!: number;

  @ApiProperty()
  exchanged!: number;

  @ApiProperty()
  today!: number;

  @ApiProperty()
  thisWeek!: number;

  @ApiProperty()
  thisMonth!: number;

  @ApiProperty({ description: 'Collected payment revenue in integer taka' })
  totalRevenue!: number;

  @ApiProperty({ description: 'Average collected order value in integer taka' })
  averageOrderValue!: number;
}
