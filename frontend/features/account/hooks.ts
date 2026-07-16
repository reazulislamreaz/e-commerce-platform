'use client';

import { useCallback, useEffect, useState } from 'react';
import { accountRepository } from './api';
import type {
  AccountCoupon,
  AccountNotification,
  AccountReview,
  CustomerOrder,
  ReturnRequest,
  SavedAddress,
} from './api';

function useAccountResource<T>(
  userId: string | undefined,
  loader: (userId: string) => Promise<T>,
  initial: T,
) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(Boolean(userId));

  const reload = useCallback(async () => {
    if (!userId) {
      setData(initial);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(await loader(userId));
    } finally {
      setLoading(false);
    }
  }, [userId, loader, initial]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, setData, loading, reload };
}

export function useAccountOrders(userId: string | undefined) {
  const loader = useCallback((id: string) => accountRepository.getOrders(id), []);
  return useAccountResource(userId, loader, [] as CustomerOrder[]);
}

export function useAccountAddresses(userId: string | undefined) {
  const loader = useCallback((id: string) => accountRepository.getAddresses(id), []);
  return useAccountResource(userId, loader, [] as SavedAddress[]);
}

export function useAccountNotifications(userId: string | undefined) {
  const loader = useCallback((id: string) => accountRepository.getNotifications(id), []);
  return useAccountResource(userId, loader, [] as AccountNotification[]);
}

export function useAccountCoupons(userId: string | undefined) {
  const loader = useCallback((id: string) => accountRepository.getCoupons(id), []);
  return useAccountResource(userId, loader, [] as AccountCoupon[]);
}

export function useAccountReviews(userId: string | undefined) {
  const loader = useCallback((id: string) => accountRepository.getReviews(id), []);
  return useAccountResource(userId, loader, [] as AccountReview[]);
}

export function useAccountReturns(userId: string | undefined) {
  const loader = useCallback((id: string) => accountRepository.getReturnRequests(id), []);
  return useAccountResource(userId, loader, [] as ReturnRequest[]);
}
