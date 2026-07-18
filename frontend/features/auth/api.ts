import { apiClient } from '@/services/api-client';
import type { ApiEnvelope } from '@/types/api';
import type { AuthUser } from '@/types/auth';
import type { LoginInput, RegisterInput } from './schemas';

export interface LoginResult {
  user: AuthUser;
  accessToken: string;
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const { data } = await apiClient.post<ApiEnvelope<LoginResult>>('/auth/login', input);
  return data.data;
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  const payload = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    password: input.password,
  };
  const { data } = await apiClient.post<ApiEnvelope<AuthUser>>('/auth/register', payload);
  return data.data;
}

export async function verifyEmail(token: string): Promise<void> {
  await apiClient.get('/auth/verify-email', { params: { token } });
}

export async function resendVerification(email: string): Promise<void> {
  await apiClient.post('/auth/resend-verification', { email });
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
