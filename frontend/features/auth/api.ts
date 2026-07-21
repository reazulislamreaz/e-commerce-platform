import { apiClient } from '@/services/api-client';
import type { ApiEnvelope } from '@/types/api';
import type { AuthUser } from '@/types/auth';
import type { LoginInput, RegisterInput } from './schemas';

export interface LoginResult {
  user: AuthUser;
  accessToken: string;
}

export async function login(input: LoginInput & { rememberMe?: boolean }): Promise<LoginResult> {
  const { data } = await apiClient.post<ApiEnvelope<LoginResult>>('/auth/login', input);
  return data.data;
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  const payload = {
    fullName: input.fullName,
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

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function resetPassword(input: { token: string; password: string }): Promise<void> {
  await apiClient.post('/auth/reset-password', input);
}

export async function changePassword(input: {
  currentPassword: string;
  password: string;
}): Promise<void> {
  await apiClient.post('/auth/change-password', input);
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export async function updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
  const { data } = await apiClient.patch<ApiEnvelope<AuthUser>>('/users/me', input);
  return data.data;
}
