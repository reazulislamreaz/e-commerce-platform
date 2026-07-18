import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsBdPhone } from '@/common/decorators/is-bd-phone.decorator';

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Rahim', minLength: 1, maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : (value as string)))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Khan', minLength: 1, maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : (value as string)))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({
    description:
      'Bangladeshi mobile number; accepts 01712345678 or +8801712345678 and is stored as +8801712345678',
    example: '01712345678',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : (value as string)))
  @IsBdPhone()
  phone?: string;
}
