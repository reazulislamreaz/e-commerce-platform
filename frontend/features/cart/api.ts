import { apiClient } from '@/services/api-client';
import { unwrapData, type ApiResponse } from '@/types/api';
import type { CartItem } from '@/store/slices/cart-slice';

export interface ServerCartItem {
  productId: string;
  variantId: string;
  size: string;
  color: string;
  quantity: number;
  availableStock?: number;
  unitPrice?: number;
  name?: string;
  image?: string;
}

export interface ServerCart {
  id: string;
  version: number;
  items: ServerCartItem[];
}

export function toReduxCartItems(cart: ServerCart): CartItem[] {
  return cart.items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
  }));
}

export async function fetchServerCart(): Promise<ServerCart> {
  const { data } = await apiClient.get<ApiResponse<ServerCart>>('/cart');
  return unwrapData(data);
}

export async function upsertServerCartItem(
  variantId: string,
  quantity: number,
): Promise<ServerCart> {
  const { data } = await apiClient.post<ApiResponse<ServerCart>>('/cart/items', {
    variantId,
    quantity,
  });
  return unwrapData(data);
}

export async function setServerCartItemQuantity(
  variantId: string,
  quantity: number,
): Promise<ServerCart> {
  const { data } = await apiClient.patch<ApiResponse<ServerCart>>(
    `/cart/items/${variantId}`,
    { quantity },
  );
  return unwrapData(data);
}

export async function removeServerCartItem(variantId: string): Promise<ServerCart> {
  const { data } = await apiClient.delete<ApiResponse<ServerCart>>(
    `/cart/items/${variantId}`,
  );
  return unwrapData(data);
}

export async function clearServerCart(): Promise<ServerCart> {
  const { data } = await apiClient.delete<ApiResponse<ServerCart>>('/cart');
  return unwrapData(data);
}

export async function mergeServerCart(): Promise<ServerCart> {
  const { data } = await apiClient.post<ApiResponse<ServerCart>>('/cart/merge');
  return unwrapData(data);
}
