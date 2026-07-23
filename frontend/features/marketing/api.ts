import { apiClient } from '@/services/api-client';
import { unwrapData, type ApiResponse, type OffsetPageMeta } from '@/types/api';
import type { BannerPlacement, MarketingBanner, UpsertBannerInput } from './types';

async function getData<T>(path: string, config?: Parameters<typeof apiClient.get>[1]): Promise<T> {
  const { data } = await apiClient.get<ApiResponse<T>>(path, config);
  return unwrapData(data);
}

export type MarketingBannerPage = {
  data: MarketingBanner[];
  meta: OffsetPageMeta;
};

export const marketingApi = {
  listPublic(placement: BannerPlacement) {
    return getData<MarketingBanner[]>('/banners', { params: { placement } });
  },
  async listAdmin(params?: { page?: number; limit?: number }): Promise<MarketingBannerPage> {
    const { data } = await apiClient.get<ApiResponse<MarketingBanner[], OffsetPageMeta>>(
      '/admin/banners',
      { params },
    );
    return {
      data: data.data,
      meta: data.meta ?? {
        page: params?.page ?? 1,
        pageSize: params?.limit ?? 20,
        total: data.data.length,
        totalPages: 1,
      },
    };
  },
  create(body: UpsertBannerInput) {
    return apiClient
      .post<ApiResponse<MarketingBanner>>('/admin/banners', body)
      .then(({ data }) => unwrapData(data));
  },
  update(id: string, body: Partial<UpsertBannerInput>) {
    return apiClient
      .patch<ApiResponse<MarketingBanner>>(`/admin/banners/${id}`, body)
      .then(({ data }) => unwrapData(data));
  },
  remove(id: string) {
    return apiClient.delete(`/admin/banners/${id}`);
  },
};
