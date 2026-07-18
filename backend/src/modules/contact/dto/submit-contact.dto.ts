import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class SubmitContactDto {
  @ApiProperty({ maxLength: 120 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ format: 'email' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @ApiProperty({ maxLength: 200 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ maxLength: 5000 })
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional({
    description: 'Honeypot field — must remain empty',
    maxLength: 200,
  })
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(200)
  website?: string;
}
