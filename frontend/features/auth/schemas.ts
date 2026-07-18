import { z } from 'zod';

export const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(128) });
export type LoginInput = z.infer<typeof loginSchema>;

/** Bangladeshi mobile: 01XXXXXXXXX or +8801XXXXXXXXX (operator prefix 013-019). */
export const BD_PHONE_PATTERN = /^(?:\+?880|0)1[3-9]\d{8}$/;

/** Account password policy shared by register, reset, and change flows. */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128)
  .regex(
    /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must include an uppercase letter, a lowercase letter, and a digit',
  );

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
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email: z.email() });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(80),
  lastName: z.string().min(1, 'Last name is required').max(80),
  email: z.email(),
  phone: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, ''))
    .refine((value) => value === '' || BD_PHONE_PATTERN.test(value), {
      message: 'Enter a valid Bangladeshi mobile number, e.g. 01712345678',
    })
    .optional(),
});
export type ProfileInput = z.infer<typeof profileSchema>;
