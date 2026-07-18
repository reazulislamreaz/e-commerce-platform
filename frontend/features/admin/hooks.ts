'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from './api';
import type { AdminReviewStatus, ContactStatus, NewsletterStatus, ProductStatus, UserStatus } from './types';

export const adminKeys = {
  all: ['admin'] as const,
  orders: (params?: Record<string, unknown>) => [...adminKeys.all, 'orders', params ?? {}] as const,
  order: (id: string) => [...adminKeys.all, 'order', id] as const,
  returns: (params?: Record<string, unknown>) => [...adminKeys.all, 'returns', params ?? {}] as const,
  return: (id: string) => [...adminKeys.all, 'return', id] as const,
  reviews: (params?: Record<string, unknown>) => [...adminKeys.all, 'reviews', params ?? {}] as const,
  review: (id: string) => [...adminKeys.all, 'review', id] as const,
  inventoryBalances: (params?: Record<string, unknown>) =>
    [...adminKeys.all, 'inventory-balances', params ?? {}] as const,
  inventoryLocations: () => [...adminKeys.all, 'inventory-locations'] as const,
  coupons: () => [...adminKeys.all, 'coupons'] as const,
  coupon: (id: string) => [...adminKeys.all, 'coupon', id] as const,
  products: (params?: Record<string, unknown>) => [...adminKeys.all, 'products', params ?? {}] as const,
  product: (id: string) => [...adminKeys.all, 'product', id] as const,
  brands: () => [...adminKeys.all, 'brands'] as const,
  categories: () => [...adminKeys.all, 'categories'] as const,
  collections: () => [...adminKeys.all, 'collections'] as const,
  contact: (params?: Record<string, unknown>) => [...adminKeys.all, 'contact', params ?? {}] as const,
  newsletter: (params?: Record<string, unknown>) =>
    [...adminKeys.all, 'newsletter', params ?? {}] as const,
  users: (params?: Record<string, unknown>) => [...adminKeys.all, 'users', params ?? {}] as const,
  user: (id: string) => [...adminKeys.all, 'user', id] as const,
};

export function useAdminOrders(params?: {
  cursor?: string;
  limit?: number;
  status?: string;
  number?: string;
  email?: string;
}) {
  return useQuery({
    queryKey: adminKeys.orders(params),
    queryFn: () => adminApi.listOrders(params),
  });
}

export function useAdminOrder(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.order(id ?? ''),
    queryFn: () => adminApi.getOrder(id!),
    enabled: Boolean(id),
  });
}

export function useAdminReturns(params?: { cursor?: string; limit?: number; status?: string }) {
  return useQuery({
    queryKey: adminKeys.returns(params),
    queryFn: () => adminApi.listReturns(params),
  });
}

export function useAdminReturn(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.return(id ?? ''),
    queryFn: () => adminApi.getReturn(id!),
    enabled: Boolean(id),
  });
}

export function useAdminReviews(params?: {
  cursor?: string;
  limit?: number;
  status?: AdminReviewStatus | string;
}) {
  return useQuery({
    queryKey: adminKeys.reviews(params),
    queryFn: () => adminApi.listReviews(params),
  });
}

export function useAdminReview(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.review(id ?? ''),
    queryFn: () => adminApi.getReview(id!),
    enabled: Boolean(id),
  });
}

export function useInventoryBalances(params?: {
  cursor?: string;
  limit?: number;
  variantId?: string;
  locationId?: string;
}) {
  return useQuery({
    queryKey: adminKeys.inventoryBalances(params),
    queryFn: () => adminApi.listInventoryBalances(params),
  });
}

export function useInventoryLocations() {
  return useQuery({
    queryKey: adminKeys.inventoryLocations(),
    queryFn: () => adminApi.listInventoryLocations(),
  });
}

export function useAdminCoupons() {
  return useQuery({
    queryKey: adminKeys.coupons(),
    queryFn: () => adminApi.listCoupons(),
  });
}

export function useAdminProducts(params?: {
  cursor?: string;
  limit?: number;
  status?: ProductStatus | string;
  q?: string;
}) {
  return useQuery({
    queryKey: adminKeys.products(params),
    queryFn: () => adminApi.listProducts(params),
  });
}

export function useAdminProduct(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.product(id ?? ''),
    queryFn: () => adminApi.getProduct(id!),
    enabled: Boolean(id),
  });
}

export function useAdminBrands() {
  return useQuery({ queryKey: adminKeys.brands(), queryFn: () => adminApi.listBrands() });
}

export function useAdminCategories() {
  return useQuery({ queryKey: adminKeys.categories(), queryFn: () => adminApi.listCategories() });
}

export function useAdminCollections() {
  return useQuery({
    queryKey: adminKeys.collections(),
    queryFn: () => adminApi.listCollections(),
  });
}

export function useAdminContact(params?: {
  cursor?: string;
  limit?: number;
  status?: ContactStatus | string;
}) {
  return useQuery({
    queryKey: adminKeys.contact(params),
    queryFn: () => adminApi.listContactMessages(params),
  });
}

export function useAdminNewsletter(params?: {
  cursor?: string;
  limit?: number;
  status?: NewsletterStatus | string;
}) {
  return useQuery({
    queryKey: adminKeys.newsletter(params),
    queryFn: () => adminApi.listNewsletterSubscriptions(params),
  });
}

export function useAdminUsers(params?: {
  cursor?: string;
  limit?: number;
  role?: string;
  status?: UserStatus | string;
}) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => adminApi.listUsers(params),
  });
}

export function useInvalidateAdmin() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminKeys.all });
}

export function useAdminMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
) {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void invalidate();
    },
  });
}
