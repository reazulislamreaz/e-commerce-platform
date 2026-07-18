import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class AdminCancelOrderDto {
  @ApiProperty({ example: 'Customer requested cancellation', minLength: 3, maxLength: 500 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
