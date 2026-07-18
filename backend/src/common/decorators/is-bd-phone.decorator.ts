import { registerDecorator, type ValidationOptions } from 'class-validator';
import { normalizeBdPhone } from '../utils/bd-phone';

/** Validates a Bangladeshi mobile number (01XXXXXXXXX or +8801XXXXXXXXX). */
export function IsBdPhone(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isBdPhone',
      target: object.constructor,
      propertyName,
      options: {
        message: 'phone must be a valid Bangladeshi mobile number (e.g. 01712345678)',
        ...validationOptions,
      },
      validator: {
        validate: (value: unknown): boolean =>
          typeof value === 'string' && normalizeBdPhone(value) !== null,
      },
    });
  };
}
