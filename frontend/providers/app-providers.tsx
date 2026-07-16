'use client';
import { useState, type PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { configureApiClient } from '@/services/api-client';
import { makeStore } from '@/store/store';
import { StoreHydrator } from '@/providers/store-hydrator';

export function AppProviders({ children }: PropsWithChildren) {
  const [store] = useState(() => {
    const appStore = makeStore();
    configureApiClient(appStore);
    return appStore;
  });
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 2, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <StoreHydrator>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </StoreHydrator>
      </QueryClientProvider>
    </Provider>
  );
}
