'use client';
import { useRef, type PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { configureApiClient } from '@/services/api-client';
import { makeStore, type AppStore } from '@/store/store';
export function AppProviders({ children }: PropsWithChildren) {
  const storeRef = useRef<AppStore | null>(null);
  const queryRef = useRef<QueryClient | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
    configureApiClient(storeRef.current);
  }
  if (!queryRef.current)
    queryRef.current = new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000, retry: 2, refetchOnWindowFocus: false } },
    });
  return (
    <Provider store={storeRef.current}>
      <QueryClientProvider client={queryRef.current}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Provider>
  );
}
