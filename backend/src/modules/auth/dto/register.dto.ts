import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
export class RegisterDto {
  @IsEmail() @MaxLength(320) email!: string;
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password!: string;
  @IsString() @MaxLength(80) firstName!: string;
  @IsString() @MaxLength(80) lastName!: string;
}
