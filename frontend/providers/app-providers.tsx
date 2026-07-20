'use client';

import dynamic from 'next/dynamic';
import { useState, type PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureApiClient } from '@/services/api-client';
import { makeStore } from '@/store/store';
import { MarketingConsentBridge } from '@/features/analytics/facebook-pixel';
import { StoreHydrator } from '@/providers/store-hydrator';
import { RoutePrefetcher } from '@/providers/route-prefetcher';
import { CATALOG_GC_MS, CATALOG_STALE_MS } from '@/features/products/query';

const ReactQueryDevtools = dynamic(
  () =>
    import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools),
  { ssr: false },
);

export function AppProviders({ children }: PropsWithChildren) {
  const [store] = useState(() => {
    const appStore = makeStore();
    configureApiClient(appStore);
    return appStore;
  });
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: CATALOG_STALE_MS,
            gcTime: CATALOG_GC_MS,
            retry: 2,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            structuralSharing: true,
          },
        },
      }),
  );

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <StoreHydrator>
          <RoutePrefetcher />
          <MarketingConsentBridge />
          {children}
          {process.env.NODE_ENV === 'development' ? (
            <ReactQueryDevtools initialIsOpen={false} />
          ) : null}
        </StoreHydrator>
      </QueryClientProvider>
    </Provider>
  );
}
