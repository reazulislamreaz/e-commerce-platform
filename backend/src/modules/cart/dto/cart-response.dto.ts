import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ format: 'uuid' })
  variantId!: string;

  @ApiProperty()
  size!: string;

  @ApiProperty()
  color!: string;

  @ApiProperty({ minimum: 1 })
  quantity!: number;

  @ApiProperty({ minimum: 0 })
  availableStock!: number;

  @ApiPropertyOptional({ description: 'Unit price in taka (integer)' })
  unitPrice?: number;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  image?: string;
}

export class CartResponseDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  id!: string | null;

  @ApiProperty({ minimum: 0 })
  version!: number;

  @ApiProperty({ type: [CartItemResponseDto] })
  items!: CartItemResponseDto[];
}
