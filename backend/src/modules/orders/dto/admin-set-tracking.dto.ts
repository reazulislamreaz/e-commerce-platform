import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class AdminSetTrackingDto {
  @ApiProperty({ example: 'TRK1A2B3C4D5E', minLength: 4, maxLength: 40 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(4)
  @MaxLength(40)
  trackingNumber!: string;

  @ApiPropertyOptional({ example: 'Pathao', maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? trim(value) : value))
  @IsString()
  @MaxLength(80)
  carrier?: string;
}
