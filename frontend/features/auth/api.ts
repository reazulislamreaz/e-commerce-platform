import { apiClient } from '@/services/api-client';
import type { ApiEnvelope } from '@/types/api';
import type { AuthUser } from '@/types/auth';
import type { LoginInput } from './schemas';
export interface LoginResult {
  user: AuthUser;
  accessToken: string;
}
export async function login(input: LoginInput): Promise<LoginResult> {
  const { data } = await apiClient.post<ApiEnvelope<LoginResult>>('/auth/login', input);
  return data.data;
}
