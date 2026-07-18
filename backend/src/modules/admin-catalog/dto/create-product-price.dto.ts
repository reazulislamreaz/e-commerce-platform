import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class CreateProductPriceWindowDto {
  @ApiProperty({ example: 2499, description: 'Sale price in taka' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountTaka!: number;

  @ApiPropertyOptional({ example: 2999, description: 'Compare-at price in taka' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  compareAtTaka?: number;
}
