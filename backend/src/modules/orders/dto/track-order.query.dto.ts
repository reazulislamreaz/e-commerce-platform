import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class TrackOrderQueryDto {
  @ApiProperty({ example: 'EA1A2B3C4D', description: 'Order number' })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(4)
  @MaxLength(32)
  number!: string;

  @ApiProperty({ example: 'customer@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(160)
  email!: string;
}
