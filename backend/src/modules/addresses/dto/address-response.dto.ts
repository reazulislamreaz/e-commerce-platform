import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Home' })
  label!: string;

  @ApiProperty({ example: 'Rahim Khan' })
  fullName!: string;

  @ApiProperty({ example: '+8801712345678' })
  phone!: string;

  @ApiProperty({ example: 'House 12, Road 4' })
  line1!: string;

  @ApiPropertyOptional({ example: 'Block B, Lift 3' })
  line2?: string;

  @ApiProperty({ example: 'Dhaka' })
  city!: string;

  @ApiProperty({ example: 'Dhaka' })
  district!: string;

  @ApiProperty({ example: '1207' })
  postalCode!: string;

  @ApiProperty({ example: 'Bangladesh' })
  country!: string;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty({ enum: ['shipping', 'billing'] })
  type!: 'shipping' | 'billing';
}
