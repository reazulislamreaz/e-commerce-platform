'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { adminApi } from './api';
import { mutationErrorMessage } from './mutation-error';
import type {
  AdminProductListParams,
  AdminReviewStatus,
  ContactStatus,
  NewsletterStatus,
} from './types';

const TAXONOMY_STALE_MS = 5 * 60 * 1000;
const LIST_STALE_MS = 30_000;
const INVENTORY_REFRESH_MS = 30_000;

export const adminKeys = {
  all: ['admin'] as const,
  /** Prefix keys — invalidate entire families without requiring exact params. */
  ordersRoot: () => [...adminKeys.all, 'orders'] as const,
  orderRoot: () => [...adminKeys.all, 'order'] as const,
  returnsRoot: () => [...adminKeys.all, 'returns'] as const,
  returnRoot: () => [...adminKeys.all, 'return'] as const,
  reviewsRoot: () => [...adminKeys.all, 'reviews'] as const,
  reviewRoot: () => [...adminKeys.all, 'review'] as const,
  inventoryRoot: () => [...adminKeys.all, 'inventory-balances'] as const,
  inventoryMovementsRoot: () => [...adminKeys.all, 'inventory-movements'] as const,
  stockAlertsRoot: () => [...adminKeys.all, 'stock-alerts'] as const,
  productsRoot: () => [...adminKeys.all, 'products'] as const,
  productRoot: () => [...adminKeys.all, 'product'] as const,
  contactRoot: () => [...adminKeys.all, 'contact'] as const,
  newsletterRoot: () => [...adminKeys.all, 'newsletter'] as const,
  usersRoot: () => [...adminKeys.all, 'users'] as const,
  customersRoot: () => [...adminKeys.all, 'customers'] as const,
  customerRoot: () => [...adminKeys.all, 'customer'] as const,
  orders: (params?: Record<string, unknown>) => [...adminKeys.all, 'orders', params ?? {}] as const,
  order: (id: string) => [...adminKeys.all, 'order', id] as const,
  returns: (params?: Record<string, unknown>) =>
    [...adminKeys.all, 'returns', params ?? {}] as const,
  return: (id: string) => [...adminKeys.all, 'return', id] as const,
  reviews: (params?: Record<string, unknown>) =>
    [...adminKeys.all, 'reviews', params ?? {}] as const,
  review: (id: string) => [...adminKeys.all, 'review', id] as const,
  inventoryBalances: (params?: Record<string, unknown>) =>
    [...adminKeys.all, 'inventory-balances', params ?? {}] as const,
  inventoryMovements: (params?: Record<string, unknown>) =>
    [...adminKeys.all, 'inventory-movements', params ?? {}] as const,
  inventoryLocations: () => [...adminKeys.all, 'inventory-locations'] as const,
  stockAlerts: (params?: Record<string, unknown>) =>
    [...adminKeys.all, 'stock-alerts', params ?? {}] as const,
  coupons: () => [...adminKeys.all, 'coupons'] as const,
  coupon: (id: string) => [...adminKeys.all, 'coupon', id] as const,
  couponRedemptions: (id: string, params?: Record<string, unknown>) =>
    [...adminKeys.all, 'coupon', id, 'redemptions', params ?? {}] as const,
  products: (params?: Record<string, unknown>) =>
    [...adminKeys.all, 'products', params ?? {}] as const,
  product: (id: string) => [...adminKeys.all, 'product', id] as const,
  productStats: () => [...adminKeys.all, 'product-stats'] as const,
  brands: () => [...adminKeys.all, 'brands'] as const,
  categories: () => [...adminKeys.all, 'categories'] as const,
  collections: () => [...adminKeys.all, 'collections'] as const,
  contact: (params?: Record<string, unknown>) =>
    [...adminKeys.all, 'contact', params ?? {}] as const,
  newsletter: (params?: Record<string, unknown>) =>
    [...adminKeys.all, 'newsletter', params ?? {}] as const,
  users: (params?: Record<string, unknown>) => [...adminKeys.all, 'users', params ?? {}] as const,
  user: (id: string) => [...adminKeys.all, 'user', id] as const,
  customers: (params?: Record<string, unknown>) =>
    [...adminKeys.all, 'customers', params ?? {}] as const,
  customer: (id: string) => [...adminKeys.all, 'customer', id] as const,
  analyticsOverview: () => [...adminKeys.all, 'analytics', 'overview'] as const,
  analyticsSales: (params?: Record<string, unknown>) =>
    [...adminKeys.all, 'analytics', 'sales', params ?? {}] as const,
  analyticsBestsellers: (limit: number) =>
    [...adminKeys.all, 'analytics', 'bestsellers', limit] as const,
  analyticsCustomers: () => [...adminKeys.all, 'analytics', 'customers'] as const,
  analyticsInventory: () => [...adminKeys.all, 'analytics', 'inventory'] as const,
  reportExport: (id: string) => [...adminKeys.all, 'reports', 'export', id] as const,
  customerOrders: (id: string, params?: Record<string, unknown>) =>
    [...adminKeys.all, 'customer', id, 'orders', params ?? {}] as const,
  customerActivity: (id: string, params?: Record<string, unknown>) =>
    [...adminKeys.all, 'customer', id, 'activity', params ?? {}] as const,
  customerSegments: () => [...adminKeys.all, 'customer-segments'] as const,
};

const keepPrevious = <T>(previous: T | undefined) => previous;

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
    staleTime: LIST_STALE_MS,
    placeholderData: keepPrevious,
  });
}

export function useAdminOrder(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.order(id ?? ''),
    queryFn: () => adminApi.getOrder(id!),
    enabled: Boolean(id),
    staleTime: LIST_STALE_MS,
    placeholderData: (previous) => previous,
  });
}

export function useAdminReturns(params?: { cursor?: string; limit?: number; status?: string }) {
  return useQuery({
    queryKey: adminKeys.returns(params),
    queryFn: () => adminApi.listReturns(params),
    staleTime: LIST_STALE_MS,
    placeholderData: keepPrevious,
  });
}

export function useAdminReturn(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.return(id ?? ''),
    queryFn: () => adminApi.getReturn(id!),
    enabled: Boolean(id),
    staleTime: LIST_STALE_MS,
    placeholderData: (previous) => previous,
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
    staleTime: LIST_STALE_MS,
    placeholderData: keepPrevious,
  });
}

export function useAdminReview(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.review(id ?? ''),
    queryFn: () => adminApi.getReview(id!),
    enabled: Boolean(id),
    staleTime: LIST_STALE_MS,
    placeholderData: (previous) => previous,
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
    staleTime: LIST_STALE_MS,
    refetchInterval: INVENTORY_REFRESH_MS,
    placeholderData: keepPrevious,
  });
}

export function useInventoryLocations() {
  return useQuery({
    queryKey: adminKeys.inventoryLocations(),
    queryFn: () => adminApi.listInventoryLocations(),
    staleTime: TAXONOMY_STALE_MS,
  });
}

export function useStockAlerts(params?: { limit?: number }) {
  return useQuery({
    queryKey: adminKeys.stockAlerts(params),
    queryFn: () => adminApi.listStockAlerts(params),
    staleTime: LIST_STALE_MS,
    refetchInterval: INVENTORY_REFRESH_MS,
    placeholderData: keepPrevious,
  });
}

export function useInventoryMovements(params?: {
  cursor?: string;
  limit?: number;
  variantId?: string;
}) {
  return useQuery({
    queryKey: adminKeys.inventoryMovements(params),
    queryFn: () => adminApi.listInventoryMovements(params),
    staleTime: LIST_STALE_MS,
    refetchInterval: INVENTORY_REFRESH_MS,
    placeholderData: keepPrevious,
  });
}

export function useCouponRedemptions(
  id: string | undefined,
  params?: { cursor?: string; limit?: number },
) {
  return useQuery({
    queryKey: adminKeys.couponRedemptions(id ?? '', params),
    queryFn: () => adminApi.listCouponRedemptions(id!, params),
    enabled: Boolean(id),
    staleTime: LIST_STALE_MS,
    placeholderData: keepPrevious,
  });
}

export function useProductInventoryBalances(variantIds: string[]) {
  return useQueries({
    queries: variantIds.map((variantId) => ({
      queryKey: adminKeys.inventoryBalances({ variantId, limit: 100 }),
      queryFn: () => adminApi.listInventoryBalances({ variantId, limit: 100 }),
      staleTime: LIST_STALE_MS,
    })),
    combine: (queries) => ({
      data: queries.flatMap((query) => query.data?.data ?? []),
      isLoading: queries.some((query) => query.isLoading),
      isFetching: queries.some((query) => query.isFetching),
      isError: queries.some((query) => query.isError),
    }),
  });
}

export function useAdminCoupons() {
  return useQuery({
    queryKey: adminKeys.coupons(),
    queryFn: () => adminApi.listCoupons(),
    staleTime: LIST_STALE_MS,
    placeholderData: (previous) => previous,
  });
}

export function useAdminProducts(params?: AdminProductListParams) {
  return useQuery({
    queryKey: adminKeys.products(params),
    queryFn: () => adminApi.listProducts(params),
    staleTime: LIST_STALE_MS,
    placeholderData: keepPrevious,
  });
}

export function useAdminProductStats() {
  return useQuery({
    queryKey: adminKeys.productStats(),
    queryFn: () => adminApi.getProductStats(),
    staleTime: LIST_STALE_MS,
    placeholderData: keepPrevious,
  });
}

export function useAdminProduct(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.product(id ?? ''),
    queryFn: () => adminApi.getProduct(id!),
    enabled: Boolean(id),
    staleTime: LIST_STALE_MS,
    placeholderData: (previous) => previous,
  });
}

export function useAdminBrands() {
  return useQuery({
    queryKey: adminKeys.brands(),
    queryFn: () => adminApi.listBrands(),
    staleTime: TAXONOMY_STALE_MS,
  });
}

export function useAdminCategories() {
  return useQuery({
    queryKey: adminKeys.categories(),
    queryFn: () => adminApi.listCategories(),
    staleTime: TAXONOMY_STALE_MS,
  });
}

export function useAdminCollections() {
  return useQuery({
    queryKey: adminKeys.collections(),
    queryFn: () => adminApi.listCollections(),
    staleTime: TAXONOMY_STALE_MS,
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
    staleTime: LIST_STALE_MS,
    placeholderData: keepPrevious,
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
    staleTime: LIST_STALE_MS,
    placeholderData: keepPrevious,
  });
}

export function useAdminUsers(params?: import('./types').AdminUserListParams) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => adminApi.listUsers(params),
    staleTime: LIST_STALE_MS,
    placeholderData: keepPrevious,
  });
}

export function useAdminUser(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.user(id ?? ''),
    queryFn: () => adminApi.getUserDetail(id!),
    enabled: Boolean(id),
    staleTime: LIST_STALE_MS,
    placeholderData: (previous) => previous,
  });
}

export function useAdminCustomers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  segment?: string;
  sort?: 'RECENT' | 'HIGH_VALUE';
}) {
  return useQuery({
    queryKey: adminKeys.customers(params),
    queryFn: () => adminApi.listCustomers(params),
    staleTime: LIST_STALE_MS,
    placeholderData: keepPrevious,
  });
}

export function useAdminCustomer(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.customer(id ?? ''),
    queryFn: () => adminApi.getCustomer(id!),
    enabled: Boolean(id),
    staleTime: LIST_STALE_MS,
    placeholderData: (previous) => previous,
  });
}

export function useAdminCustomerOrders(
  id: string | undefined,
  params?: { cursor?: string; limit?: number },
) {
  return useQuery({
    queryKey: adminKeys.customerOrders(id ?? '', params),
    queryFn: () => adminApi.listCustomerOrders(id!, params),
    enabled: Boolean(id),
    staleTime: LIST_STALE_MS,
    placeholderData: keepPrevious,
  });
}

export function useAdminCustomerActivity(
  id: string | undefined,
  params?: { cursor?: string; limit?: number },
) {
  return useQuery({
    queryKey: adminKeys.customerActivity(id ?? '', params),
    queryFn: () => adminApi.listCustomerActivity(id!, params),
    enabled: Boolean(id),
    staleTime: LIST_STALE_MS,
    placeholderData: keepPrevious,
  });
}

export function useCustomerSegmentSummary() {
  return useQuery({
    queryKey: adminKeys.customerSegments(),
    queryFn: () => adminApi.getCustomerSegmentSummary(),
    staleTime: LIST_STALE_MS,
    placeholderData: (previous) => previous,
  });
}

/**
 * Actionable operations queues shared by the shell (badges, notifications) and
 * the dashboard. Params are stable so every consumer hits the same cache keys.
 */
export function useAdminQueues() {
  return {
    confirmedOrders: useAdminOrders({ limit: 5, status: 'CONFIRMED' }),
    processingOrders: useAdminOrders({ limit: 5, status: 'PROCESSING' }),
    pendingReturns: useAdminReturns({ limit: 5, status: 'PENDING' }),
    pendingReviews: useAdminReviews({ limit: 5, status: 'PENDING' }),
    newContact: useAdminContact({ limit: 5, status: 'NEW' }),
  };
}

export function useInvalidateAdmin(scopes: Array<readonly unknown[]> = [adminKeys.all]) {
  const queryClient = useQueryClient();
  return () => Promise.all(scopes.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function useAdminMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  invalidateKeys: Array<readonly unknown[]> = [adminKeys.all],
  toastOptions?: {
    successMessage?: string | ((result: TResult, args: TArgs) => string);
    errorFallback?: string;
    dedupeKey?: string;
  },
) {
  const invalidate = useInvalidateAdmin(invalidateKeys);
  return useMutation({
    mutationFn,
    onSuccess: (result, args) => {
      void invalidate();
      if (toastOptions?.successMessage) {
        const message =
          typeof toastOptions.successMessage === 'function'
            ? toastOptions.successMessage(result, args)
            : toastOptions.successMessage;
        toast.success(message, { dedupeKey: toastOptions.dedupeKey });
      }
    },
    onError: (error) => {
      if (toastOptions?.errorFallback) {
        toast.error(mutationErrorMessage(error, toastOptions.errorFallback), {
          dedupeKey: toastOptions.dedupeKey ? `${toastOptions.dedupeKey}:error` : undefined,
        });
      }
    },
  });
}

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: adminKeys.analyticsOverview(),
    queryFn: () => adminApi.getAnalyticsOverview(),
    staleTime: LIST_STALE_MS,
  });
}

export function useSalesAnalytics(params?: {
  granularity?: 'day' | 'month';
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: adminKeys.analyticsSales(params),
    queryFn: () => adminApi.getSales(params),
    staleTime: LIST_STALE_MS,
  });
}

export function useBestsellers(limit = 10) {
  return useQuery({
    queryKey: adminKeys.analyticsBestsellers(limit),
    queryFn: () => adminApi.getBestsellers(limit),
    staleTime: LIST_STALE_MS,
  });
}

export function useCustomerAnalytics() {
  return useQuery({
    queryKey: adminKeys.analyticsCustomers(),
    queryFn: () => adminApi.getCustomerAnalytics(),
    staleTime: LIST_STALE_MS,
  });
}

export function useInventoryAnalytics() {
  return useQuery({
    queryKey: adminKeys.analyticsInventory(),
    queryFn: () => adminApi.getInventoryAnalytics(),
    staleTime: LIST_STALE_MS,
  });
}

export function useCreateReportExport() {
  return useMutation({
    mutationFn: adminApi.createReportExport,
  });
}

export function useReportExport(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.reportExport(id ?? ''),
    queryFn: () => adminApi.getReportExport(id!),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PENDING' || status === 'PROCESSING' ? 2000 : false;
    },
  });
}
