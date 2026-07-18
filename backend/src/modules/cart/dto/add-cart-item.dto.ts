import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  variantId!: string;

  @ApiProperty({ minimum: 1, description: 'Quantity to add to any existing line' })
  @IsInt()
  @Min(1)
  quantity!: number;
}
