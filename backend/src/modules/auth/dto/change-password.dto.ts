import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsAccountPassword } from '@/common/decorators/is-account-password.decorator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentPassw0rd!', minLength: 1, maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({
    description: '6–128 characters; any letters, numbers, or symbols',
    example: 'password',
    minLength: 6,
    maxLength: 128,
  })
  @IsAccountPassword()
  password!: string;
}
