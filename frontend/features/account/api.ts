import type {
  AccountCoupon,
  AccountNotification,
  AccountReview,
  CustomerOrder,
  ReturnRequest,
  SavedAddress,
} from './storage';
import {
  applyCoupon,
  createOrderNumber,
  getAccountReviews,
  getAddresses,
  getCoupons,
  getNotifications,
  getOrders,
  getReturnRequests,
  saveAccountReviews,
  saveAddresses,
  saveCoupons,
  saveNotifications,
  saveOrders,
  saveReturnRequests,
} from './storage';
import { httpAccountRepository } from './http-api';

export interface CursorPage<T> {
  data: T[];
  meta: { limit: number; nextCursor: string | null };
}

export type CreateAddressInput = Omit<SavedAddress, 'id' | 'country'> & { country?: string };

export type PlaceOrderInput = {
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

export type CreateReturnInput = {
  orderId: string;
  type: 'return' | 'exchange';
  reason: string;
  conditionAttested: boolean;
  items?: Array<{
    orderItemId: string;
    quantity: number;
    exchangeVariantId?: string;
  }>;
};

/**
 * Production account repository — HTTP-backed methods only.
 */
export interface AccountRepository {
  getAddresses(): Promise<SavedAddress[]>;
  createAddress(input: CreateAddressInput): Promise<SavedAddress>;
  updateAddress(
    id: string,
    input: Partial<Omit<SavedAddress, 'id' | 'country'>> & { country?: string },
  ): Promise<SavedAddress>;
  setDefaultAddress(id: string): Promise<SavedAddress>;
  deleteAddress(id: string): Promise<void>;

  getOrders(params?: { cursor?: string; limit?: number }): Promise<CursorPage<CustomerOrder>>;
  getOrder(id: string): Promise<CustomerOrder>;
  placeOrderCheckout(input: PlaceOrderInput, idempotencyKey?: string): Promise<CustomerOrder>;
  trackOrder(number: string, email: string): Promise<CustomerOrder>;
  /** Authenticated invoice PDF for an owned order. */
  downloadInvoice(orderId: string): Promise<Blob>;
  /** Guest invoice PDF via order number + email. */
  downloadGuestInvoice(number: string, email: string): Promise<Blob>;

  getNotifications(params?: {
    cursor?: string;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<CursorPage<AccountNotification>>;
  getUnreadNotificationCount(): Promise<number>;
  markNotificationRead(id: string): Promise<AccountNotification>;
  markAllNotificationsRead(): Promise<void>;

  getCoupons(): Promise<AccountCoupon[]>;
  validateCoupon(
    code: string,
    subtotal: number,
  ): Promise<{ code: string; discount: number; shippingWaived: boolean; title: string }>;

  getReturnRequests(): Promise<ReturnRequest[]>;
  createReturnRequest(input: CreateReturnInput): Promise<ReturnRequest>;

  getReviews(): Promise<AccountReview[]>;
  createReview(input: {
    productId: string;
    rating: number;
    title: string;
    body: string;
  }): Promise<AccountReview>;
  updateReview(
    id: string,
    input: { rating?: number; title?: string; body?: string },
  ): Promise<AccountReview>;
  deleteReview(id: string): Promise<void>;
}

/** Local storage adapter for isolated tests — not used in production UI. */
export interface LocalAccountRepository extends AccountRepository {
  saveAddresses(userId: string, addresses: SavedAddress[]): Promise<void>;
  saveOrders(userId: string, orders: CustomerOrder[]): Promise<void>;
  saveNotifications(userId: string, items: AccountNotification[]): Promise<void>;
  saveCoupons(userId: string, items: AccountCoupon[]): Promise<void>;
  saveReturnRequests(userId: string, items: ReturnRequest[]): Promise<void>;
  saveReviews(userId: string, items: AccountReview[]): Promise<void>;
  placeOrder(userId: string | null, order: CustomerOrder): Promise<CustomerOrder>;
  applyCoupon(
    code: string,
    subtotal: number,
    coupons: AccountCoupon[],
  ): { discount: number; coupon?: AccountCoupon; error?: string };
  createOrderNumber(): string;
}

function notSupported(method: string): never {
  throw new Error(`${method} is not supported on the local account adapter stub`);
}

export const localAccountRepository: LocalAccountRepository = {
  async getAddresses(userId = '') {
    return getAddresses(userId);
  },
  async createAddress() {
    return notSupported('createAddress');
  },
  async updateAddress() {
    return notSupported('updateAddress');
  },
  async setDefaultAddress() {
    return notSupported('setDefaultAddress');
  },
  async deleteAddress() {
    return notSupported('deleteAddress');
  },
  async saveAddresses(userId, addresses) {
    saveAddresses(userId, addresses);
  },
  async getOrders(_params?: { cursor?: string; limit?: number }) {
    return { data: getOrders(''), meta: { limit: _params?.limit ?? 20, nextCursor: null } };
  },
  async getOrder(id: string) {
    void id;
    return notSupported('getOrder');
  },
  async saveOrders(userId, orders) {
    saveOrders(userId, orders);
  },
  async placeOrder(userId, order) {
    if (userId) {
      const orders = getOrders(userId);
      saveOrders(userId, [order, ...orders]);
    }
    return order;
  },
  async placeOrderCheckout() {
    return notSupported('placeOrderCheckout');
  },
  async trackOrder() {
    return notSupported('trackOrder');
  },
  async downloadInvoice() {
    return notSupported('downloadInvoice');
  },
  async downloadGuestInvoice() {
    return notSupported('downloadGuestInvoice');
  },
  async getNotifications(params?: { cursor?: string; limit?: number; unreadOnly?: boolean }) {
    const items = getNotifications('');
    const filtered = params?.unreadOnly ? items.filter((item) => !item.read) : items;
    return { data: filtered, meta: { limit: params?.limit ?? 20, nextCursor: null } };
  },
  async getUnreadNotificationCount() {
    return getNotifications('').filter((item) => !item.read).length;
  },
  async markNotificationRead() {
    return notSupported('markNotificationRead');
  },
  async saveNotifications(userId, items) {
    saveNotifications(userId, items);
  },
  async markAllNotificationsRead() {
    return notSupported('markAllNotificationsRead');
  },
  async getCoupons(userId = '') {
    return getCoupons(userId);
  },
  async saveCoupons(userId, items) {
    saveCoupons(userId, items);
  },
  async validateCoupon(code, subtotal) {
    const result = applyCoupon(code, subtotal, getCoupons(''));
    if (result.error || !result.coupon) {
      throw new Error(
        result.error ??
          'This coupon code is invalid or has expired. Please check the code and try again.',
      );
    }
    return {
      code: result.coupon.code,
      discount: result.discount,
      shippingWaived: result.coupon.discountType === 'free_shipping',
      title: result.coupon.title,
    };
  },
  async getReturnRequests(userId = '') {
    return getReturnRequests(userId);
  },
  async saveReturnRequests(userId, items) {
    saveReturnRequests(userId, items);
  },
  async createReturnRequest() {
    return notSupported('createReturnRequest');
  },
  async getReviews(userId = '') {
    return getAccountReviews(userId);
  },
  async saveReviews(userId, items) {
    saveAccountReviews(userId, items);
  },
  async createReview() {
    return notSupported('createReview');
  },
  async updateReview() {
    return notSupported('updateReview');
  },
  async deleteReview() {
    return notSupported('deleteReview');
  },
  applyCoupon,
  createOrderNumber,
};

export const accountRepository: AccountRepository = httpAccountRepository;

export type {
  AccountCoupon,
  AccountNotification,
  AccountReview,
  CustomerOrder,
  ReturnRequest,
  SavedAddress,
};
