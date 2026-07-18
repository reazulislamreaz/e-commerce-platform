import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { IsAccountPassword } from '@/common/decorators/is-account-password.decorator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Single-use reset token from the emailed link' })
  @IsString()
  @Length(16, 128)
  token!: string;

  @ApiProperty({
    description: '12-128 characters with at least one lowercase, uppercase, and digit',
    example: 'NewStrongPassw0rd!',
    minLength: 12,
    maxLength: 128,
  })
  @IsAccountPassword()
  password!: string;
}
