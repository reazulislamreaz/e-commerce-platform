import { apiClient } from '@/services/api-client';
import { unwrapData, type ApiResponse } from '@/types/api';

export interface UserPreferences {
  emailOrderUpdates: boolean;
  emailMarketing: boolean;
  inAppEnabled: boolean;
}

export async function getPreferences(): Promise<UserPreferences> {
  const { data } = await apiClient.get<ApiResponse<UserPreferences>>('/users/me/preferences');
  return unwrapData(data);
}

export async function updatePreferences(
  input: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const { data } = await apiClient.patch<ApiResponse<UserPreferences>>(
    '/users/me/preferences',
    input,
  );
  return unwrapData(data);
}
