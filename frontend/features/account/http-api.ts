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
import type { AccountRepository } from './api';

type CreateAddressInput = Omit<SavedAddress, 'id' | 'country'> & { country?: string };

type PlaceOrderInput = {
  fullName: string;
  phone: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  district: string;
  postalCode: string;
  paymentMethod: 'cod';
  notes?: string;
  couponCode?: string;
  items: Array<{ variantId: string; quantity: number }>;
};

async function getData<T>(path: string, config?: Parameters<typeof apiClient.get>[1]): Promise<T> {
  const { data } = await apiClient.get<ApiResponse<T>>(path, config);
  return unwrapData(data);
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

  async deleteAddress(id: string) {
    await deleteData(`/addresses/${id}`);
  },

  async saveAddresses() {
    throw new Error('saveAddresses is not supported over HTTP; use createAddress/deleteAddress');
  },

  async getOrders() {
    const page = await getData<CustomerOrder[]>('/orders');
    return page;
  },

  async getOrder(id: string) {
    return getData<CustomerOrder>(`/orders/${id}`);
  },

  async saveOrders() {
    throw new Error('saveOrders is not supported over HTTP');
  },

  async placeOrder(_userId, order) {
    // Legacy signature kept for type compat; HTTP path uses placeOrderCheckout.
    return order;
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

  async saveNotifications() {
    throw new Error('saveNotifications is not supported over HTTP');
  },

  async markAllNotificationsRead() {
    await postData('/notifications/read-all');
  },

  async getCoupons() {
    return getData<AccountCoupon[]>('/coupons/mine');
  },

  async saveCoupons() {
    throw new Error('saveCoupons is not supported over HTTP');
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

  async saveReturnRequests() {
    throw new Error('saveReturnRequests is not supported over HTTP');
  },

  async createReturnRequest(input: {
    orderId: string;
    type: 'return' | 'exchange';
    reason: string;
  }) {
    return postData<ReturnRequest>('/returns', input);
  },

  async getReviews() {
    return getData<AccountReview[]>('/reviews');
  },

  async saveReviews() {
    throw new Error('saveReviews is not supported over HTTP');
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

  applyCoupon() {
    return { discount: 0, error: 'Use validateCoupon over HTTP' };
  },

  createOrderNumber() {
    return '';
  },
};

export type { PlaceOrderInput, CreateAddressInput };
