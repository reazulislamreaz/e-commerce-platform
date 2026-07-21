import { applyDecorators } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Account password policy shared by registration, password reset, and
 * password change: 6–128 characters of any kind (mirrors the storefront Zod schema).
 */
export function IsAccountPassword(): PropertyDecorator {
  return applyDecorators(IsString(), MinLength(6), MaxLength(128));
}
