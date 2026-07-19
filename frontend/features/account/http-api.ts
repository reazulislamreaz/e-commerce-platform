import { apiClient } from '@/services/api-client';
import { unwrapData, type ApiResponse } from '@/types/api';
import type {
  AccountCoupon,
  AccountNotification,
  AccountReview,
  CustomerOrder,
  ReturnRequest,
  SavedAddress,
} from './storage';
import type {
  AccountRepository,
  CreateAddressInput,
  CreateReturnInput,
  CursorPage,
  PlaceOrderInput,
} from './api';

async function getData<T>(path: string, config?: Parameters<typeof apiClient.get>[1]): Promise<T> {
  const { data } = await apiClient.get<ApiResponse<T>>(path, config);
  return unwrapData(data);
}

async function getPage<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<CursorPage<T>> {
  const { data } = await apiClient.get<ApiResponse<T[]>>(path, { params });
  return {
    data: unwrapData(data),
    meta: {
      limit: Number(data.meta?.limit ?? params?.limit ?? 20),
      nextCursor: (data.meta?.nextCursor as string | null | undefined) ?? null,
    },
  };
}

async function postData<T>(
  path: string,
  body?: unknown,
  config?: Parameters<typeof apiClient.post>[2],
): Promise<T> {
  const { data } = await apiClient.post<ApiResponse<T>>(path, body, config);
  return unwrapData(data);
}

async function patchData<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.patch<ApiResponse<T>>(path, body);
  return unwrapData(data);
}

async function deleteData(path: string): Promise<void> {
  await apiClient.delete(path);
}

export const httpAccountRepository: AccountRepository = {
  async getAddresses() {
    return getData<SavedAddress[]>('/addresses');
  },

  async createAddress(input: CreateAddressInput) {
    return postData<SavedAddress>('/addresses', {
      ...input,
      type: input.type ?? 'shipping',
      country: 'Bangladesh',
    });
  },

  async updateAddress(id, input) {
    return patchData<SavedAddress>(`/addresses/${id}`, {
      ...input,
      ...(input.type ? { type: input.type } : {}),
    });
  },

  async setDefaultAddress(id) {
    return postData<SavedAddress>(`/addresses/${id}/default`);
  },

  async deleteAddress(id: string) {
    await deleteData(`/addresses/${id}`);
  },

  async getOrders(params) {
    return getPage<CustomerOrder>('/orders', {
      limit: params?.limit ?? 20,
      ...(params?.cursor ? { cursor: params.cursor } : {}),
    });
  },

  async getOrder(id: string) {
    return getData<CustomerOrder>(`/orders/${id}`);
  },

  async placeOrderCheckout(input: PlaceOrderInput, idempotencyKey?: string) {
    return postData<CustomerOrder>('/orders', input, {
      headers: { 'Idempotency-Key': idempotencyKey ?? crypto.randomUUID() },
    });
  },

  async trackOrder(number: string, email: string) {
    return getData<CustomerOrder>('/orders/track', { params: { number, email } });
  },

  async getNotifications() {
    return getData<AccountNotification[]>('/notifications');
  },

  async markAllNotificationsRead() {
    await postData('/notifications/read-all');
  },

  async getCoupons() {
    return getData<AccountCoupon[]>('/coupons/mine');
  },

  async validateCoupon(code: string, subtotal: number) {
    return postData<{
      code: string;
      discount: number;
      shippingWaived: boolean;
      title: string;
    }>('/coupons/validate', { code, subtotal });
  },

  async getReturnRequests() {
    return getData<ReturnRequest[]>('/returns');
  },

  async createReturnRequest(input: CreateReturnInput) {
    return postData<ReturnRequest>('/returns', input);
  },

  async getReviews() {
    return getData<AccountReview[]>('/reviews');
  },

  async createReview(input: {
    productId: string;
    rating: number;
    title: string;
    body: string;
  }) {
    return postData<AccountReview>('/reviews', input);
  },

  async updateReview(
    id: string,
    input: { rating?: number; title?: string; body?: string },
  ) {
    return patchData<AccountReview>(`/reviews/${id}`, input);
  },

  async deleteReview(id: string) {
    await deleteData(`/reviews/${id}`);
  },
};

export type { PlaceOrderInput, CreateAddressInput };
