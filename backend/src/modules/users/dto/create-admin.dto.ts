import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { IsAccountPassword } from '@/common/decorators/is-account-password.decorator';
import { IsBdPhone } from '@/common/decorators/is-bd-phone.decorator';

/** Admin create keeps separate name fields; storefront register uses `fullName`. */
export class CreateAdminDto {
  @ApiProperty({ example: 'admin@example.com', maxLength: 320 })
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
    description: '6–128 characters; any letters, numbers, or symbols',
    example: 'password',
    minLength: 6,
    maxLength: 128,
  })
  @IsAccountPassword()
  password!: string;

  @ApiProperty({ example: 'Admin', minLength: 1, maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : (value as string)))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'User', minLength: 1, maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : (value as string)))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;
}
