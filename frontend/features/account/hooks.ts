'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export const accountKeys = {
  all: ['account'] as const,
  orders: (userId: string, cursor?: string | null) =>
    [...accountKeys.all, 'orders', userId, cursor ?? 'initial'] as const,
  addresses: (userId: string) => [...accountKeys.all, 'addresses', userId] as const,
  notifications: (userId: string) => [...accountKeys.all, 'notifications', userId] as const,
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

export function useAccountAddresses(userId: string | undefined) {
  return useAccountResource(
    userId,
    userId ? accountKeys.addresses(userId) : accountKeys.all,
    () => accountRepository.getAddresses(),
    EMPTY_ADDRESSES,
  );
}

export function useAccountNotifications(userId: string | undefined) {
  return useAccountResource(
    userId,
    userId ? accountKeys.notifications(userId) : accountKeys.all,
    () => accountRepository.getNotifications(),
    EMPTY_NOTIFICATIONS,
  );
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
    },
  });
}
