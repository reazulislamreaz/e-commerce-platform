import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Account password policy shared by registration, password reset, and
 * password change: 12-128 characters with at least one lowercase letter,
 * one uppercase letter, and one digit (mirrors the storefront Zod schema).
 */
export function IsAccountPassword(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    MinLength(12),
    MaxLength(128),
    Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: 'Password must include an uppercase letter, a lowercase letter, and a digit.',
    }),
  );
}
