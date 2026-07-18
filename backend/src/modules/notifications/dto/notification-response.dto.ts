import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Order shipped' })
  title!: string;

  @ApiProperty({ example: 'Your order EA1A2B3C has shipped.' })
  body!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ example: false })
  read!: boolean;

  @ApiPropertyOptional({ example: '/account/orders/abc' })
  href?: string;
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: 3 })
  count!: number;
}

export class ReadAllResponseDto {
  @ApiProperty({ example: 5 })
  updated!: number;
}
