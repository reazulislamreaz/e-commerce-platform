import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty({ example: 'ELEVATE10', maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string;

  @ApiProperty({
    example: 2000,
    description: 'Cart subtotal in whole taka (BDT)',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  subtotal!: number;
}
