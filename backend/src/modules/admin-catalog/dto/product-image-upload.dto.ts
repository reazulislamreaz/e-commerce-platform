import { ApiProperty } from '@nestjs/swagger';

export class ProductImageUploadResponseDto {
  @ApiProperty({
    description: 'Relative URL where the stored image is served',
    example: '/uploads/products/mdkq3f1a-6f6a2c9e-2b1a-4c3d-9e8f-0a1b2c3d4e5f.webp',
  })
  url!: string;

  @ApiProperty({ description: 'Server-generated filename on disk' })
  filename!: string;
}
