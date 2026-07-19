'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';
import { getPreferences } from '@/features/preferences/api';
import { readStorage, writeStorage } from '@/lib/storage';
import {
  canTrackWithMarketingConsent,
  MARKETING_CONSENT_STORAGE_KEY,
} from './pixel-consent';

const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID?.trim() ?? '';

export function useMarketingConsent() {
  const user = useAppSelector(selectAuthUser);
  const authHydrated = useAppSelector((state) => state.auth.hydrated);
  const isGuest = authHydrated && !user;

  const prefsQuery = useQuery({
    queryKey: ['marketing-consent', user?.id],
    queryFn: getPreferences,
    enabled: authHydrated && Boolean(user),
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (prefsQuery.data) {
      writeStorage(MARKETING_CONSENT_STORAGE_KEY, prefsQuery.data.emailMarketing);
    }
  }, [prefsQuery.data]);

  const consentLoaded =
    authHydrated && (isGuest || !user || prefsQuery.isFetched || prefsQuery.isError);
  const emailMarketing = isGuest
    ? false
    : (prefsQuery.data?.emailMarketing ??
      readStorage<boolean>(MARKETING_CONSENT_STORAGE_KEY, false));

  const canTrack = canTrackWithMarketingConsent({
    pixelConfigured: Boolean(PIXEL_ID),
    isAuthenticated: Boolean(user),
    consentLoaded,
    emailMarketing,
  });

  return { canTrack, consentLoaded, emailMarketing, pixelId: PIXEL_ID };
}
