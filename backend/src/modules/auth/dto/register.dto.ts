import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IsBdPhone } from '@/common/decorators/is-bd-phone.decorator';

export class RegisterDto {
  @ApiProperty({ example: 'customer@example.com', maxLength: 320 })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({
    description:
      'Bangladeshi mobile number; accepts 01712345678 or +8801712345678 and is stored as +8801712345678',
    example: '01712345678',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : (value as string)))
  @IsBdPhone()
  phone!: string;

  @ApiProperty({
    description: '12-128 characters with at least one lowercase, uppercase, and digit',
    example: 'StrongPassw0rd!',
    minLength: 12,
    maxLength: 128,
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'password must contain a lowercase letter, an uppercase letter, and a digit',
  })
  password!: string;

  @ApiProperty({ example: 'Rahim', minLength: 1, maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : (value as string)))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'Khan', minLength: 1, maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : (value as string)))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;
}
