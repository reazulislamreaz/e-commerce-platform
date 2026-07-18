import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Equals, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubscribeNewsletterDto {
  @ApiProperty({ format: 'email' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @ApiProperty({ example: true, description: 'Must be true to subscribe' })
  @Equals(true)
  consent!: true;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;
}

export class UnsubscribeNewsletterQueryDto {
  @ApiProperty({ description: 'Opaque unsubscribe token from the welcome email' })
  @IsString()
  @MaxLength(128)
  token!: string;
}
