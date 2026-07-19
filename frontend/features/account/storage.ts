import type { AuthUser } from '@/types/auth';
import { readStorage, writeStorage } from '@/lib/storage';

export type AddressType = 'shipping' | 'billing';

export interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  district: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  type: AddressType;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface OrderLineItem {
  orderItemId?: string;
  variantId?: string;
  productId: string;
  name: string;
  slug: string;
  image: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
}

export interface CustomerOrder {
  id: string;
  number: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderLineItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  couponCode?: string;
  shippingAddress: SavedAddress;
  paymentMethod: 'cod' | 'bkash' | 'card'; // bkash/card reserved until gateways ship
  trackingNumber?: string;
  timeline: { label: string; at: string; done: boolean }[];
}

export interface AccountNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

export interface AccountCoupon {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percent' | 'fixed' | 'free_shipping';
  value: number;
  minOrder: number;
  expiresAt: string;
  used: boolean;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
  type: 'return' | 'exchange';
}

export interface AccountReview {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  verified?: boolean;
  status?: 'pending' | 'published' | 'rejected';
  publishedAt?: string;
}

function userKey(userId: string, suffix: string) {
  return `account:${userId}:${suffix}`;
}

export function getAddresses(userId: string): SavedAddress[] {
  return readStorage(userKey(userId, 'addresses'), []);
}

export function saveAddresses(userId: string, addresses: SavedAddress[]) {
  writeStorage(userKey(userId, 'addresses'), addresses);
}

export function getOrders(userId: string): CustomerOrder[] {
  return readStorage(userKey(userId, 'orders'), seedOrders());
}

export function saveOrders(userId: string, orders: CustomerOrder[]) {
  writeStorage(userKey(userId, 'orders'), orders);
}

export function getNotifications(userId: string): AccountNotification[] {
  return readStorage(userKey(userId, 'notifications'), seedNotifications());
}

export function saveNotifications(userId: string, items: AccountNotification[]) {
  writeStorage(userKey(userId, 'notifications'), items);
}

export function getCoupons(userId: string): AccountCoupon[] {
  return readStorage(userKey(userId, 'coupons'), seedCoupons());
}

export function saveCoupons(userId: string, items: AccountCoupon[]) {
  writeStorage(userKey(userId, 'coupons'), items);
}

export function getReturnRequests(userId: string): ReturnRequest[] {
  return readStorage(userKey(userId, 'returns'), []);
}

export function saveReturnRequests(userId: string, items: ReturnRequest[]) {
  writeStorage(userKey(userId, 'returns'), items);
}

export function getAccountReviews(userId: string): AccountReview[] {
  return readStorage(userKey(userId, 'reviews'), []);
}

export function saveAccountReviews(userId: string, items: AccountReview[]) {
  writeStorage(userKey(userId, 'reviews'), items);
}

export function displayName(user: AuthUser | null | undefined) {
  if (!user) return 'Guest';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || user.email;
}

function seedOrders(): CustomerOrder[] {
  return [];
}

function seedNotifications(): AccountNotification[] {
  return [
    {
      id: 'n1',
      title: 'Welcome to Elevate Apparel',
      body: 'Explore new arrivals and elevate your everyday wardrobe.',
      createdAt: new Date().toISOString(),
      read: false,
      href: '/new-arrivals',
    },
  ];
}

function seedCoupons(): AccountCoupon[] {
  return [
    {
      id: 'c1',
      code: 'ELEVATE10',
      title: '10% off your first order',
      description: 'Valid on orders over ৳1500. One-time use.',
      discountType: 'percent',
      value: 10,
      minOrder: 1500,
      expiresAt: '2026-12-31',
      used: false,
    },
    {
      id: 'c2',
      code: 'FREESHIP',
      title: 'Free shipping',
      description: 'Waives shipping on any order. One-time use.',
      discountType: 'fixed',
      value: 120,
      minOrder: 0,
      expiresAt: '2026-09-30',
      used: false,
    },
  ];
}

export function createOrderNumber() {
  return `EA${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export function applyCoupon(
  code: string,
  subtotal: number,
  coupons: AccountCoupon[],
): { discount: number; coupon?: AccountCoupon; error?: string } {
  const coupon = coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase() && !c.used);
  if (!coupon) return { discount: 0, error: 'Invalid or expired coupon code.' };
  if (subtotal < coupon.minOrder) {
    return {
      discount: 0,
      error: `Minimum order of ৳${coupon.minOrder} required for this coupon.`,
    };
  }
  const discount =
    coupon.discountType === 'percent'
      ? Math.round((subtotal * coupon.value) / 100)
      : Math.min(coupon.value, subtotal);
  return { discount, coupon };
}
