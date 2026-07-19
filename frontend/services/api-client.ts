import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { AppStore } from '@/store/store';
import { accessTokenRefreshed, signedOut } from '@/store/slices/auth-slice';
/**
 * Server-side rendering inside Docker reaches the backend over the internal
 * network (API_URL_INTERNAL, runtime env); browsers use the public URL, which
 * is inlined at build time via NEXT_PUBLIC_API_URL.
 */
const baseURL =
  (typeof window === 'undefined' && process.env.API_URL_INTERNAL) ||
  process.env.NEXT_PUBLIC_API_URL;

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
let store: AppStore | undefined;
let refreshPromise: Promise<string> | undefined;
export function configureApiClient(appStore: AppStore): void {
  store = appStore;
}
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = store?.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (
      !axios.isAxiosError(error) ||
      error.response?.status !== 401 ||
      !error.config ||
      error.config.url?.endsWith('/auth/refresh') ||
      (error.config as InternalAxiosRequestConfig & { _retry?: boolean })._retry
    )
      return Promise.reject(error);
    const request = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    request._retry = true;
    try {
      refreshPromise ??= apiClient
        .post<{ data: { accessToken: string } }>('/auth/refresh')
        .then(({ data }) => data.data.accessToken)
        .finally(() => {
          refreshPromise = undefined;
        });
      const token = await refreshPromise;
      store?.dispatch(accessTokenRefreshed(token));
      request.headers.Authorization = `Bearer ${token}`;
      return apiClient(request);
    } catch (refreshError) {
      store?.dispatch(signedOut());
      return Promise.reject(refreshError);
    }
  },
);
