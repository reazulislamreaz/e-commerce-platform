import { apiClient } from '@/services/api-client';
import { unwrapData, type ApiResponse } from '@/types/api';

export async function submitContact(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string;
}): Promise<{ message: string }> {
  const { data } = await apiClient.post<ApiResponse<{ message: string }>>('/contact', {
    name: input.name,
    email: input.email,
    subject: input.subject,
    message: input.message,
    website: input.website ?? '',
  });
  return unwrapData(data);
}
