import { ApiProperty } from '@nestjs/swagger';

export class WishlistResponseDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  productIds!: string[];
}
