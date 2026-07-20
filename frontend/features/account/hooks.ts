'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast, toastErrorFrom } from '@/lib/toast';
import { productKeys } from '@/features/products';
import { accountRepository } from './api';
import type {
  AccountCoupon,
  AccountNotification,
  AccountReview,
  CustomerOrder,
  ReturnRequest,
  SavedAddress,
} from './api';

const EMPTY_ORDERS: CustomerOrder[] = [];
const EMPTY_ADDRESSES: SavedAddress[] = [];
const EMPTY_NOTIFICATIONS: AccountNotification[] = [];
const EMPTY_COUPONS: AccountCoupon[] = [];
const EMPTY_REVIEWS: AccountReview[] = [];
const EMPTY_RETURNS: ReturnRequest[] = [];
const TERMINAL_ORDER_STATUSES = new Set(['delivered', 'cancelled', 'returned', 'exchanged']);

export const accountKeys = {
  all: ['account'] as const,
  orders: (userId: string, cursor?: string | null) =>
    [...accountKeys.all, 'orders', userId, cursor ?? 'initial'] as const,
  order: (userId: string, orderId: string) =>
    [...accountKeys.all, 'order', userId, orderId] as const,
  trackedOrder: (number: string, email: string) =>
    [...accountKeys.all, 'tracked-order', number, email] as const,
  addresses: (userId: string) => [...accountKeys.all, 'addresses', userId] as const,
  notificationsRoot: (userId: string) => [...accountKeys.all, 'notifications', userId] as const,
  notifications: (userId: string, cursor?: string | null) =>
    [...accountKeys.notificationsRoot(userId), cursor ?? 'initial'] as const,
  unreadNotifications: (userId: string) =>
    [...accountKeys.all, 'notifications-unread', userId] as const,
  coupons: (userId: string) => [...accountKeys.all, 'coupons', userId] as const,
  reviews: (userId: string) => [...accountKeys.all, 'reviews', userId] as const,
  returns: (userId: string) => [...accountKeys.all, 'returns', userId] as const,
};

function useAccountResource<T>(
  userId: string | undefined,
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
  empty: T,
) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn,
    enabled: Boolean(userId),
  });

  const setData = (next: T) => {
    if (userId) {
      queryClient.setQueryData(queryKey, next);
    }
  };

  return {
    data: query.data ?? empty,
    loading: query.isLoading,
    error: query.isError,
    setData,
    reload: () => query.refetch(),
  };
}

export function useAccountOrders(
  userId: string | undefined,
  params?: { cursor?: string; limit?: number },
) {
  const query = useQuery({
    queryKey: userId ? accountKeys.orders(userId, params?.cursor) : accountKeys.all,
    queryFn: () => accountRepository.getOrders(params),
    enabled: Boolean(userId),
  });

  return {
    data: query.data?.data ?? EMPTY_ORDERS,
    meta: query.data?.meta ?? { limit: params?.limit ?? 20, nextCursor: null },
    loading: query.isLoading,
    error: query.isError,
    refetch: () => query.refetch(),
  };
}

export function useAccountOrder(userId: string | undefined, orderId: string | undefined) {
  return useQuery({
    queryKey: userId && orderId ? accountKeys.order(userId, orderId) : accountKeys.all,
    queryFn: () => accountRepository.getOrder(orderId!),
    enabled: Boolean(userId && orderId),
    refetchInterval: (query) => {
      const order = query.state.data;
      return order && !TERMINAL_ORDER_STATUSES.has(order.status.toLowerCase()) ? 30_000 : false;
    },
  });
}

export function useTrackedOrder(number: string, email: string, enabled: boolean) {
  return useQuery({
    queryKey: accountKeys.trackedOrder(number, email),
    queryFn: () => accountRepository.trackOrder(number, email),
    enabled: enabled && Boolean(number && email),
    retry: false,
    refetchInterval: (query) => {
      const order = query.state.data;
      return order && !TERMINAL_ORDER_STATUSES.has(order.status.toLowerCase()) ? 30_000 : false;
    },
  });
}

export function useAccountAddresses(userId: string | undefined) {
  return useAccountResource(
    userId,
    userId ? accountKeys.addresses(userId) : accountKeys.all,
    () => accountRepository.getAddresses(),
    EMPTY_ADDRESSES,
  );
}

export function useAccountNotifications(
  userId: string | undefined,
  params?: { cursor?: string; limit?: number; unreadOnly?: boolean },
) {
  const query = useQuery({
    queryKey: userId ? accountKeys.notifications(userId, params?.cursor) : accountKeys.all,
    queryFn: () => accountRepository.getNotifications(params),
    enabled: Boolean(userId),
  });

  return {
    data: query.data?.data ?? EMPTY_NOTIFICATIONS,
    meta: query.data?.meta ?? { limit: params?.limit ?? 20, nextCursor: null },
    loading: query.isLoading,
    error: query.isError,
    refetch: () => query.refetch(),
    isFetching: query.isFetching,
  };
}

export function useUnreadNotificationCount(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? accountKeys.unreadNotifications(userId) : accountKeys.all,
    queryFn: () => accountRepository.getUnreadNotificationCount(),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountRepository.markNotificationRead(id),
    onSuccess: async () => {
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountKeys.notificationsRoot(userId) }),
        queryClient.invalidateQueries({ queryKey: accountKeys.unreadNotifications(userId) }),
      ]);
    },
  });
}

export function useMarkAllNotificationsRead(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => accountRepository.markAllNotificationsRead(),
    onSuccess: async () => {
      toast.success('All notifications marked as read.', { dedupeKey: 'notifications:read-all' });
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accountKeys.notificationsRoot(userId) }),
        queryClient.invalidateQueries({ queryKey: accountKeys.unreadNotifications(userId) }),
      ]);
    },
    onError: (error) => {
      toastErrorFrom(
        error,
        'Could not mark notifications as read.',
        'notifications:read-all-error',
      );
    },
  });
}

export function useAccountCoupons(userId: string | undefined) {
  return useAccountResource(
    userId,
    userId ? accountKeys.coupons(userId) : accountKeys.all,
    () => accountRepository.getCoupons(),
    EMPTY_COUPONS,
  );
}

export function useAccountReviews(userId: string | undefined) {
  return useAccountResource(
    userId,
    userId ? accountKeys.reviews(userId) : accountKeys.all,
    () => accountRepository.getReviews(),
    EMPTY_REVIEWS,
  );
}

export function useCreateReview(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { productId: string; rating: number; title: string; body: string }) =>
      accountRepository.createReview(input),
    onSuccess: async () => {
      await Promise.all([
        userId
          ? queryClient.invalidateQueries({ queryKey: accountKeys.reviews(userId) })
          : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
      ]);
      toast.success('Review submitted. It will appear after moderation.', {
        dedupeKey: 'review:create',
      });
    },
    onError: (error) => {
      toastErrorFrom(error, 'Could not submit review. Please try again.', 'review:create-error');
    },
  });
}

export function useUpdateReview(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; rating?: number; title?: string; body?: string }) => {
      const { id, ...body } = input;
      return accountRepository.updateReview(id, body);
    },
    onSuccess: async () => {
      await Promise.all([
        userId
          ? queryClient.invalidateQueries({ queryKey: accountKeys.reviews(userId) })
          : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
      ]);
      toast.success('Review updated.', { dedupeKey: 'review:update' });
    },
    onError: (error) => {
      toastErrorFrom(error, 'Could not update review. Please try again.', 'review:update-error');
    },
  });
}

export function useDeleteReview(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountRepository.deleteReview(id),
    onSuccess: async () => {
      await Promise.all([
        userId
          ? queryClient.invalidateQueries({ queryKey: accountKeys.reviews(userId) })
          : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
      ]);
      toast.success('Review deleted.', { dedupeKey: 'review:delete' });
    },
    onError: (error) => {
      toastErrorFrom(error, 'Could not delete review. Please try again.', 'review:delete-error');
    },
  });
}

export function useAccountReturns(userId: string | undefined) {
  return useAccountResource(
    userId,
    userId ? accountKeys.returns(userId) : accountKeys.all,
    () => accountRepository.getReturnRequests(),
    EMPTY_RETURNS,
  );
}

export function useCreateReturnRequest(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountRepository.createReturnRequest,
    onSuccess: async () => {
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: accountKeys.returns(userId) });
      }
      toast.success('Return request submitted.', { dedupeKey: 'return:create' });
    },
    onError: (error) => {
      toastErrorFrom(
        error,
        'Could not submit return request. Please try again.',
        'return:create-error',
      );
    },
  });
}
