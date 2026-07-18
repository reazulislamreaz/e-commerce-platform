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
  orders: (userId: string) => [...accountKeys.all, 'orders', userId] as const,
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
    setData,
    reload: () => query.refetch(),
  };
}

export function useAccountOrders(userId: string | undefined) {
  return useAccountResource(
    userId,
    userId ? accountKeys.orders(userId) : accountKeys.all,
    () => accountRepository.getOrders(userId!),
    EMPTY_ORDERS,
  );
}

export function useAccountAddresses(userId: string | undefined) {
  return useAccountResource(
    userId,
    userId ? accountKeys.addresses(userId) : accountKeys.all,
    () => accountRepository.getAddresses(userId!),
    EMPTY_ADDRESSES,
  );
}

export function useAccountNotifications(userId: string | undefined) {
  return useAccountResource(
    userId,
    userId ? accountKeys.notifications(userId) : accountKeys.all,
    () => accountRepository.getNotifications(userId!),
    EMPTY_NOTIFICATIONS,
  );
}

export function useAccountCoupons(userId: string | undefined) {
  return useAccountResource(
    userId,
    userId ? accountKeys.coupons(userId) : accountKeys.all,
    () => accountRepository.getCoupons(userId!),
    EMPTY_COUPONS,
  );
}

export function useAccountReviews(userId: string | undefined) {
  return useAccountResource(
    userId,
    userId ? accountKeys.reviews(userId) : accountKeys.all,
    () => accountRepository.getReviews(userId!),
    EMPTY_REVIEWS,
  );
}

export function useCreateReview(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { productId: string; rating: number; title: string; body: string }) => {
      if (!accountRepository.createReview) {
        return Promise.reject(new Error('createReview is not available'));
      }
      return accountRepository.createReview(input);
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

export function useUpdateReview(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; rating?: number; title?: string; body?: string }) => {
      if (!accountRepository.updateReview) {
        return Promise.reject(new Error('updateReview is not available'));
      }
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
    mutationFn: (id: string) => {
      if (!accountRepository.deleteReview) {
        return Promise.reject(new Error('deleteReview is not available'));
      }
      return accountRepository.deleteReview(id);
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

export function useAccountReturns(userId: string | undefined) {
  return useAccountResource(
    userId,
    userId ? accountKeys.returns(userId) : accountKeys.all,
    () => accountRepository.getReturnRequests(userId!),
    EMPTY_RETURNS,
  );
}
