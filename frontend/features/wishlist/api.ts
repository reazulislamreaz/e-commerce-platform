import { apiClient } from '@/services/api-client';
import { unwrapData, type ApiResponse } from '@/types/api';

export async function fetchWishlist(): Promise<string[]> {
  const { data } = await apiClient.get<ApiResponse<{ productIds: string[] }>>('/wishlist');
  return unwrapData(data).productIds;
}

export async function addWishlistProduct(productId: string): Promise<string[]> {
  const { data } = await apiClient.put<ApiResponse<{ productIds: string[] }>>(
    `/wishlist/${productId}`,
  );
  return unwrapData(data).productIds;
}

export async function removeWishlistProduct(productId: string): Promise<string[]> {
  const { data } = await apiClient.delete<ApiResponse<{ productIds: string[] }>>(
    `/wishlist/${productId}`,
  );
  return unwrapData(data).productIds;
}

export async function mergeWishlist(productIds: string[]): Promise<string[]> {
  const { data } = await apiClient.post<ApiResponse<{ productIds: string[] }>>(
    '/wishlist/merge',
    { productIds },
  );
  return unwrapData(data).productIds;
}
