'use client';

import dynamic from 'next/dynamic';
import { useState, type PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureApiClient } from '@/services/api-client';
import { makeStore } from '@/store/store';
import { StoreHydrator } from '@/providers/store-hydrator';

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
          queries: { staleTime: 30_000, retry: 2, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <StoreHydrator>
          {children}
          {process.env.NODE_ENV === 'development' ? (
            <ReactQueryDevtools initialIsOpen={false} />
          ) : null}
        </StoreHydrator>
      </QueryClientProvider>
    </Provider>
  );
}
