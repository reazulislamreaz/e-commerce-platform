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

/**
 * Customer account persistence.
 * Local implementation uses localStorage keyed by user id.
 * Replace with HTTP calls against Nest account/orders modules when available.
 */
export interface AccountRepository {
  getAddresses(userId: string): Promise<SavedAddress[]>;
  saveAddresses(userId: string, addresses: SavedAddress[]): Promise<void>;
  getOrders(userId: string): Promise<CustomerOrder[]>;
  saveOrders(userId: string, orders: CustomerOrder[]): Promise<void>;
  placeOrder(userId: string | null, order: CustomerOrder): Promise<CustomerOrder>;
  getNotifications(userId: string): Promise<AccountNotification[]>;
  saveNotifications(userId: string, items: AccountNotification[]): Promise<void>;
  getCoupons(userId: string): Promise<AccountCoupon[]>;
  saveCoupons(userId: string, items: AccountCoupon[]): Promise<void>;
  getReturnRequests(userId: string): Promise<ReturnRequest[]>;
  saveReturnRequests(userId: string, items: ReturnRequest[]): Promise<void>;
  getReviews(userId: string): Promise<AccountReview[]>;
  saveReviews(userId: string, items: AccountReview[]): Promise<void>;
  applyCoupon(
    code: string,
    subtotal: number,
    coupons: AccountCoupon[],
  ): { discount: number; coupon?: AccountCoupon; error?: string };
  createOrderNumber(): string;
}

export const localAccountRepository: AccountRepository = {
  async getAddresses(userId) {
    return getAddresses(userId);
  },
  async saveAddresses(userId, addresses) {
    saveAddresses(userId, addresses);
  },
  async getOrders(userId) {
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
  async getNotifications(userId) {
    return getNotifications(userId);
  },
  async saveNotifications(userId, items) {
    saveNotifications(userId, items);
  },
  async getCoupons(userId) {
    return getCoupons(userId);
  },
  async saveCoupons(userId, items) {
    saveCoupons(userId, items);
  },
  async getReturnRequests(userId) {
    return getReturnRequests(userId);
  },
  async saveReturnRequests(userId, items) {
    saveReturnRequests(userId, items);
  },
  async getReviews(userId) {
    return getAccountReviews(userId);
  },
  async saveReviews(userId, items) {
    saveAccountReviews(userId, items);
  },
  applyCoupon,
  createOrderNumber,
};

export const accountRepository: AccountRepository = localAccountRepository;

export type {
  AccountCoupon,
  AccountNotification,
  AccountReview,
  CustomerOrder,
  ReturnRequest,
  SavedAddress,
};
