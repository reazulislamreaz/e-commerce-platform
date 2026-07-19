import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerSegmentKey, OrderStatus, UserStatus } from '@/generated/prisma/client';

export class CustomerMetricResponseDto {
  @ApiProperty()
  orderCount!: number;

  @ApiProperty()
  deliveredOrderCount!: number;

  @ApiProperty({ description: 'Lifetime value in Bangladeshi taka' })
  lifetimeValue!: number;

  @ApiProperty({ description: 'Average delivered order value in Bangladeshi taka' })
  averageOrderValue!: number;

  @ApiPropertyOptional()
  lastOrderAt?: string;

  @ApiPropertyOptional()
  firstOrderAt?: string;

  @ApiProperty()
  cancelledOrderCount!: number;

  @ApiProperty()
  returnCount!: number;

  @ApiProperty()
  wishlistItemCount!: number;

  @ApiProperty({ enum: CustomerSegmentKey })
  segment!: CustomerSegmentKey;
}

export class CustomerResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ type: CustomerMetricResponseDto })
  metrics!: CustomerMetricResponseDto;
}

export class CustomerOrderHistoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  number!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty()
  itemCount!: number;

  @ApiProperty({ description: 'Order total in Bangladeshi taka' })
  total!: number;

  @ApiProperty()
  createdAt!: string;
}

export class CustomerActivityResponseDto {
  @ApiProperty({ description: 'BigInt cursor represented as a string' })
  id!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  href?: string;

  @ApiPropertyOptional({ type: Object })
  metadata?: Record<string, unknown>;

  @ApiProperty()
  createdAt!: string;
}

export class SegmentSummaryResponseDto {
  @ApiProperty({ enum: CustomerSegmentKey })
  segment!: CustomerSegmentKey;

  @ApiProperty()
  count!: number;
}
