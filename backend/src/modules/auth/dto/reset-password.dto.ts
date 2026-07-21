import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { IsAccountPassword } from '@/common/decorators/is-account-password.decorator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Single-use reset token from the emailed link' })
  @IsString()
  @Length(16, 128)
  token!: string;

  @ApiProperty({
    description: '6–128 characters; any letters, numbers, or symbols',
    example: 'password',
    minLength: 6,
    maxLength: 128,
  })
  @IsAccountPassword()
  password!: string;
}
