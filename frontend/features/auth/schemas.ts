import { z } from 'zod';

export const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(128) });
export type LoginInput = z.infer<typeof loginSchema>;

/** Bangladeshi mobile: 01XXXXXXXXX or +8801XXXXXXXXX (operator prefix 013-019). */
export const BD_PHONE_PATTERN = /^(?:\+?880|0)1[3-9]\d{8}$/;

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(80),
    lastName: z.string().min(1, 'Last name is required').max(80),
    email: z.email(),
    phone: z
      .string()
      .min(1, 'Mobile number is required')
      .transform((value) => value.replace(/[\s-]/g, ''))
      .refine((value) => BD_PHONE_PATTERN.test(value), {
        message: 'Enter a valid Bangladeshi mobile number, e.g. 01712345678',
      }),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .max(128)
      .regex(
        /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must include an uppercase letter, a lowercase letter, and a digit',
      ),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;
