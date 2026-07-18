import { ApiProperty } from '@nestjs/swagger';

export class ReturnRequestResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiProperty({ example: 'EA1A2B3C' })
  orderNumber!: string;

  @ApiProperty({ example: 'Wrong size received' })
  reason!: string;

  @ApiProperty({ enum: ['pending', 'approved', 'rejected', 'completed'] })
  status!: 'pending' | 'approved' | 'rejected' | 'completed';

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ enum: ['return', 'exchange'] })
  type!: 'return' | 'exchange';
}

export class ReturnItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  orderItemId!: string;

  @ApiProperty({ example: 1 })
  quantity!: number;
}

export class ReturnDetailResponseDto extends ReturnRequestResponseDto {
  @ApiProperty({ type: [ReturnItemResponseDto] })
  items!: ReturnItemResponseDto[];
}
