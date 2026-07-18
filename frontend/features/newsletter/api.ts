import { apiClient } from '@/services/api-client';
import { unwrapData, type ApiResponse } from '@/types/api';

export async function subscribeNewsletter(email: string, consent: boolean): Promise<void> {
  await apiClient.post<ApiResponse<{ email: string }>>('/newsletter', {
    email,
    consent,
    source: 'homepage',
  });
}

export async function unsubscribeNewsletter(token: string): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
    '/newsletter/unsubscribe',
    null,
    { params: { token } },
  );
  unwrapData(data);
}
