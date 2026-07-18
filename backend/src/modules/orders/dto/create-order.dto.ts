import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateOrderItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  variantId!: string;

  @ApiProperty({ minimum: 1, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'Rahim Khan', minLength: 2, maxLength: 80 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName!: string;

  @ApiProperty({
    description: 'Bangladeshi mobile number',
    example: '01712345678',
    minLength: 10,
    maxLength: 20,
  })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: 'customer@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @ApiProperty({ example: 'House 12, Road 4', minLength: 3, maxLength: 120 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  line1!: string;

  @ApiPropertyOptional({ example: 'Block B, Lift 3', maxLength: 120 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? trim(value) : value))
  @IsString()
  @MaxLength(120)
  line2?: string;

  @ApiProperty({ example: 'Dhaka', minLength: 2, maxLength: 80 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city!: string;

  @ApiProperty({ example: 'Dhaka', minLength: 2, maxLength: 80 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  district!: string;

  @ApiProperty({ example: '1207', minLength: 3, maxLength: 20 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  postalCode!: string;

  @ApiProperty({ enum: ['cod'], example: 'cod' })
  @IsIn(['cod'])
  paymentMethod!: 'cod';

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? trim(value) : value))
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ example: 'ELEVATE10', maxLength: 40 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? trim(value) : value))
  @IsString()
  @MaxLength(40)
  couponCode?: string;

  @ApiPropertyOptional({
    type: [CreateOrderItemDto],
    description: 'When omitted, lines are taken from the signed-in or guest server cart.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}
