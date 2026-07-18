import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ example: 'Essential Oversized Tee' })
  productName!: string;

  @ApiProperty({ example: 'essential-oversized-tee' })
  productSlug!: string;

  @ApiProperty({ example: 5 })
  rating!: number;

  @ApiProperty({ example: 'Great fit' })
  title!: string;

  @ApiProperty({ example: 'Soft fabric and true to size.' })
  body!: string;

  @ApiProperty({ example: '2026-07-18T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: true })
  verified!: boolean;

  @ApiProperty({ enum: ['pending', 'published', 'rejected'] })
  status!: 'pending' | 'published' | 'rejected';

  @ApiPropertyOptional({ example: '2026-07-18T12:00:00.000Z' })
  publishedAt?: string;

  @ApiProperty({ example: 'Rahim Khan' })
  authorName!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  userId?: string;
}
