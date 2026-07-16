import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { AppStore } from '@/store/store';
import { accessTokenRefreshed, signedOut } from '@/store/slices/auth-slice';
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
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
