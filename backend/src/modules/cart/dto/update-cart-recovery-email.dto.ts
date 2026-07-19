import { IsEmail, MaxLength } from 'class-validator';

export class UpdateCartRecoveryEmailDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
