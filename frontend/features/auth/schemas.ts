import { z } from 'zod';

export const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(128) });
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(80),
    lastName: z.string().min(1, 'Last name is required').max(80),
    email: z.email(),
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
