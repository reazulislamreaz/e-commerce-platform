import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyEmailQueryDto {
  @ApiProperty({ description: 'Verification token from the email link' })
  @IsString()
  @Length(16, 128)
  token!: string;
}
