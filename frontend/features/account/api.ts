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

/**
 * Customer account persistence.
 * Active implementation talks to Nest account/orders APIs.
 * Local adapter remains for isolated tests.
 */
export interface AccountRepository {
  getAddresses(userId?: string): Promise<SavedAddress[]>;
  createAddress?(
    input: Omit<SavedAddress, 'id' | 'country'> & { country?: string },
  ): Promise<SavedAddress>;
  deleteAddress?(id: string): Promise<void>;
  saveAddresses(userId: string, addresses: SavedAddress[]): Promise<void>;
  getOrders(userId?: string): Promise<CustomerOrder[]>;
  getOrder?(id: string): Promise<CustomerOrder>;
  saveOrders(userId: string, orders: CustomerOrder[]): Promise<void>;
  placeOrder(userId: string | null, order: CustomerOrder): Promise<CustomerOrder>;
  placeOrderCheckout?(input: {
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
  }): Promise<CustomerOrder>;
  trackOrder?(number: string, email: string): Promise<CustomerOrder>;
  getNotifications(userId?: string): Promise<AccountNotification[]>;
  saveNotifications(userId: string, items: AccountNotification[]): Promise<void>;
  markAllNotificationsRead?(): Promise<void>;
  getCoupons(userId?: string): Promise<AccountCoupon[]>;
  saveCoupons(userId: string, items: AccountCoupon[]): Promise<void>;
  validateCoupon?(
    code: string,
    subtotal: number,
  ): Promise<{ code: string; discount: number; shippingWaived: boolean; title: string }>;
  getReturnRequests(userId?: string): Promise<ReturnRequest[]>;
  saveReturnRequests(userId: string, items: ReturnRequest[]): Promise<void>;
  createReturnRequest?(input: {
    orderId: string;
    type: 'return' | 'exchange';
    reason: string;
  }): Promise<ReturnRequest>;
  getReviews(userId?: string): Promise<AccountReview[]>;
  saveReviews(userId: string, items: AccountReview[]): Promise<void>;
  applyCoupon(
    code: string,
    subtotal: number,
    coupons: AccountCoupon[],
  ): { discount: number; coupon?: AccountCoupon; error?: string };
  createOrderNumber(): string;
}

export const localAccountRepository: AccountRepository = {
  async getAddresses(userId = '') {
    return getAddresses(userId);
  },
  async saveAddresses(userId, addresses) {
    saveAddresses(userId, addresses);
  },
  async getOrders(userId = '') {
    return getOrders(userId);
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
  async getNotifications(userId = '') {
    return getNotifications(userId);
  },
  async saveNotifications(userId, items) {
    saveNotifications(userId, items);
  },
  async getCoupons(userId = '') {
    return getCoupons(userId);
  },
  async saveCoupons(userId, items) {
    saveCoupons(userId, items);
  },
  async getReturnRequests(userId = '') {
    return getReturnRequests(userId);
  },
  async saveReturnRequests(userId, items) {
    saveReturnRequests(userId, items);
  },
  async getReviews(userId = '') {
    return getAccountReviews(userId);
  },
  async saveReviews(userId, items) {
    saveAccountReviews(userId, items);
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
