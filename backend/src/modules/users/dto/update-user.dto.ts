import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({
    example: '01812345678',
    description: 'Bangladeshi mobile (01XXXXXXXXX or +8801XXXXXXXXX)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(?:\+8801|01)[3-9]\d{8}$/, {
    message: 'Phone must be a valid Bangladeshi mobile number',
  })
  phone?: string;
}
