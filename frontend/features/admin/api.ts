import { apiClient } from '@/services/api-client';
import { unwrapData, type ApiResponse } from '@/types/api';
import type {
  AdminBrand,
  AdminCategory,
  AdminCollection,
  AdminCoupon,
  AdminOrder,
  AdminOrderStatus,
  AdminProductDetail,
  AdminProductListParams,
  AdminProductStats,
  AdminProductSummary,
  AdminReturn,
  AdminReview,
  AdminReviewStatus,
  AdminReturnStatus,
  AdminUser,
  AdminUserDetail,
  AdminUserListParams,
  BulkUserAction,
  AnalyticsOverview,
  OffsetPage,
  Bestseller,
  ContactMessage,
  ContactStatus,
  CursorPage,
  CreateAdminProductInput,
  InventoryBalance,
  InventoryLocation,
  InventoryMovement,
  InventoryAnalytics,
  NewsletterStatus,
  NewsletterSubscription,
  ReportExportFormat,
  ReportExportJob,
  ReportExportType,
  SalesPoint,
  CustomerAnalytics,
  UpdateAdminProductInput,
  UserStatus,
  AdminCustomer,
  CustomerActivity,
  CustomerOrderHistory,
  CustomerSegment,
  CustomerSegmentSummary,
} from './types';

async function getData<T>(path: string, config?: Parameters<typeof apiClient.get>[1]): Promise<T> {
  const { data } = await apiClient.get<ApiResponse<T>>(path, config);
  return unwrapData(data);
}

async function getPage<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<CursorPage<T>> {
  const { data } = await apiClient.get<ApiResponse<T[]>>(path, { params });
  return {
    data: unwrapData(data),
    meta: {
      limit: Number(data.meta?.limit ?? params?.limit ?? 20),
      nextCursor: (data.meta?.nextCursor as string | null | undefined) ?? null,
    },
  };
}

async function getOffsetPage<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<OffsetPage<T>> {
  const { data } = await apiClient.get<ApiResponse<T[]>>(path, { params });
  const rows = unwrapData(data);
  const pageSize = Number(data.meta?.pageSize ?? data.meta?.limit ?? params?.limit ?? 20);
  const page = Number(data.meta?.page ?? params?.page ?? 1);
  const total = Number(data.meta?.total ?? rows.length);
  const totalPages = Number(data.meta?.totalPages ?? Math.max(1, Math.ceil(total / pageSize)));
  return {
    data: rows,
    meta: {
      page,
      pageSize,
      limit: pageSize,
      total,
      totalPages,
      nextCursor: (data.meta?.nextCursor as string | null | undefined) ?? null,
    },
  };
}

async function postData<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.post<ApiResponse<T>>(path, body);
  return unwrapData(data);
}

async function patchData<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.patch<ApiResponse<T>>(path, body);
  return unwrapData(data);
}

async function deleteData(path: string): Promise<void> {
  await apiClient.delete(path);
}

export const adminApi = {
  listCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    segment?: CustomerSegment | string;
    sort?: 'RECENT' | 'HIGH_VALUE';
  }) {
    return getOffsetPage<AdminCustomer>('/admin/customers', params);
  },
  getCustomer(id: string) {
    return getData<AdminCustomer>(`/admin/customers/${id}`);
  },
  listCustomerOrders(id: string, params?: { cursor?: string; limit?: number }) {
    return getPage<CustomerOrderHistory>(`/admin/customers/${id}/orders`, params);
  },
  listCustomerActivity(id: string, params?: { cursor?: string; limit?: number }) {
    return getPage<CustomerActivity>(`/admin/customers/${id}/activity`, params);
  },
  getCustomerSegmentSummary() {
    return getData<CustomerSegmentSummary[]>('/admin/customers/segments/summary');
  },

  listOrders(params?: {
    cursor?: string;
    limit?: number;
    status?: string;
    number?: string;
    email?: string;
  }) {
    return getPage<AdminOrder>('/admin/orders', params);
  },
  getOrder(id: string) {
    return getData<AdminOrder>(`/admin/orders/${id}`);
  },
  updateOrderStatus(
    id: string,
    body: {
      status: Uppercase<AdminOrderStatus> | string;
      note?: string;
      trackingNumber?: string;
      carrier?: string;
    },
  ) {
    return postData<AdminOrder>(`/admin/orders/${id}/status`, body);
  },
  setOrderTracking(id: string, body: { trackingNumber: string; carrier?: string }) {
    return postData<AdminOrder>(`/admin/orders/${id}/tracking`, body);
  },
  cancelOrder(id: string, reason: string) {
    return postData<AdminOrder>(`/admin/orders/${id}/cancel`, { reason });
  },

  listReturns(params?: { cursor?: string; limit?: number; status?: string }) {
    return getPage<AdminReturn>('/admin/returns', params);
  },
  getReturn(id: string) {
    return getData<AdminReturn>(`/admin/returns/${id}`);
  },
  approveReturn(id: string, note?: string) {
    return postData<AdminReturn>(`/admin/returns/${id}/approve`, { note });
  },
  rejectReturn(id: string, note?: string) {
    return postData<AdminReturn>(`/admin/returns/${id}/reject`, { note });
  },
  completeReturn(id: string, note?: string) {
    return postData<AdminReturn>(`/admin/returns/${id}/complete`, { note });
  },

  listReviews(params?: { cursor?: string; limit?: number; status?: AdminReviewStatus | string }) {
    return getPage<AdminReview>('/admin/reviews', params);
  },
  getReview(id: string) {
    return getData<AdminReview>(`/admin/reviews/${id}`);
  },
  publishReview(id: string, note?: string) {
    return postData<AdminReview>(`/admin/reviews/${id}/publish`, { note });
  },
  rejectReview(id: string, note?: string) {
    return postData<AdminReview>(`/admin/reviews/${id}/reject`, { note });
  },

  listInventoryBalances(params?: {
    cursor?: string;
    limit?: number;
    variantId?: string;
    locationId?: string;
  }) {
    return getPage<InventoryBalance>('/admin/inventory/balances', params);
  },
  listInventoryMovements(params?: { cursor?: string; limit?: number; variantId?: string }) {
    return getPage<InventoryMovement>('/admin/inventory/movements', params);
  },
  listInventoryLocations() {
    return getData<InventoryLocation[]>('/admin/inventory/locations');
  },
  listStockAlerts(params?: { limit?: number }) {
    return getData<
      Array<{
        id: string;
        level: 'LOW' | 'OUT';
        available: number;
        threshold: number;
        createdAt: string;
        variantId: string;
        sku: string;
        size: string;
        color: string;
        locationId: string;
        locationCode: string;
        locationName: string;
        onHand: number;
        reserved: number;
      }>
    >('/admin/inventory/alerts', { params });
  },
  adjustInventory(body: {
    variantId: string;
    locationId: string;
    quantityDelta: number;
    idempotencyKey: string;
    note?: string;
    expectedVersion?: number;
  }) {
    return postData<{ success: true }>('/admin/inventory/adjustments', body);
  },

  listCoupons() {
    return getData<AdminCoupon[]>('/admin/coupons');
  },
  getCoupon(id: string) {
    return getData<AdminCoupon>(`/admin/coupons/${id}`);
  },
  createCoupon(body: Record<string, unknown>) {
    return postData<AdminCoupon>('/admin/coupons', body);
  },
  updateCoupon(id: string, body: Record<string, unknown>) {
    return patchData<AdminCoupon>(`/admin/coupons/${id}`, body);
  },
  deactivateCoupon(id: string) {
    return postData<AdminCoupon>(`/admin/coupons/${id}/deactivate`);
  },
  listCouponRedemptions(id: string, params?: { cursor?: string; limit?: number }) {
    return getPage<{
      id: string;
      orderId: string;
      userId?: string | null;
      discountTaka: number;
      shippingWaived: boolean;
      createdAt: string;
    }>(`/admin/coupons/${id}/redemptions`, params);
  },

  listProducts(params?: AdminProductListParams) {
    return getPage<AdminProductSummary>('/admin/products', params);
  },
  getProductStats() {
    return getData<AdminProductStats>('/admin/products/stats');
  },
  getProduct(id: string) {
    return getData<AdminProductDetail>(`/admin/products/${id}`);
  },
  createProduct(body: CreateAdminProductInput) {
    return postData<AdminProductDetail>('/admin/products', body);
  },
  updateProduct(id: string, body: UpdateAdminProductInput) {
    return patchData<AdminProductDetail>(`/admin/products/${id}`, body);
  },
  async uploadProductImage(file: File) {
    const body = new FormData();
    body.append('file', file);
    // Override the client's JSON default so axios sends real multipart form data
    // (with a JSON content type, axios 1.x serializes FormData to JSON instead).
    const { data } = await apiClient.post<ApiResponse<{ url: string }>>(
      '/admin/products/images',
      body,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return unwrapData(data);
  },
  publishProduct(id: string) {
    return postData<AdminProductDetail>(`/admin/products/${id}/publish`);
  },
  unpublishProduct(id: string) {
    return postData<AdminProductDetail>(`/admin/products/${id}/unpublish`);
  },
  archiveProduct(id: string) {
    return postData<AdminProductDetail>(`/admin/products/${id}/archive`);
  },
  addProductPrice(id: string, body: { amountTaka: number; compareAtTaka?: number }) {
    return postData<AdminProductDetail>(`/admin/products/${id}/prices`, body);
  },

  listBrands() {
    return getData<AdminBrand[]>('/admin/brands');
  },
  createBrand(body: { name: string; slug?: string; isActive?: boolean }) {
    return postData<AdminBrand>('/admin/brands', body);
  },
  updateBrand(id: string, body: { name?: string; slug?: string; isActive?: boolean }) {
    return patchData<AdminBrand>(`/admin/brands/${id}`, body);
  },
  deleteBrand(id: string) {
    return deleteData(`/admin/brands/${id}`);
  },

  listCategories() {
    return getData<AdminCategory[]>('/admin/categories');
  },
  createCategory(body: {
    name: string;
    slug?: string;
    parentId?: string;
    position?: number;
    isActive?: boolean;
  }) {
    return postData<AdminCategory>('/admin/categories', body);
  },
  updateCategory(
    id: string,
    body: {
      name?: string;
      slug?: string;
      parentId?: string | null;
      position?: number;
      isActive?: boolean;
    },
  ) {
    return patchData<AdminCategory>(`/admin/categories/${id}`, body);
  },
  deleteCategory(id: string) {
    return deleteData(`/admin/categories/${id}`);
  },

  listCollections() {
    return getData<AdminCollection[]>('/admin/collections');
  },
  createCollection(body: { name: string; slug?: string; position?: number; isActive?: boolean }) {
    return postData<AdminCollection>('/admin/collections', body);
  },
  updateCollection(
    id: string,
    body: { name?: string; slug?: string; position?: number; isActive?: boolean },
  ) {
    return patchData<AdminCollection>(`/admin/collections/${id}`, body);
  },
  deleteCollection(id: string) {
    return deleteData(`/admin/collections/${id}`);
  },

  listContactMessages(params?: {
    cursor?: string;
    limit?: number;
    status?: ContactStatus | string;
  }) {
    return getPage<ContactMessage>('/admin/contact-messages', params);
  },
  updateContactMessage(id: string, body: { status?: ContactStatus; adminNotes?: string }) {
    return patchData<ContactMessage>(`/admin/contact-messages/${id}`, body);
  },

  listNewsletterSubscriptions(params?: {
    cursor?: string;
    limit?: number;
    status?: NewsletterStatus | string;
  }) {
    return getPage<NewsletterSubscription>('/admin/newsletter/subscriptions', params);
  },
  forceUnsubscribe(id: string) {
    return postData<NewsletterSubscription>(`/admin/newsletter/subscriptions/${id}/unsubscribe`);
  },

  listUsers(params?: AdminUserListParams) {
    return getOffsetPage<AdminUser>('/users', {
      ...params,
      ...(params?.verified !== undefined ? { verified: params.verified } : {}),
      ...(params?.deleted !== undefined ? { deleted: params.deleted } : {}),
    });
  },
  getUser(id: string) {
    return getData<AdminUser>(`/users/${id}`);
  },
  getUserDetail(id: string) {
    return getData<AdminUserDetail>(`/users/${id}/detail`);
  },
  updateUser(id: string, body: { firstName?: string; lastName?: string; phone?: string }) {
    return patchData<AdminUser>(`/users/${id}`, body);
  },
  updateUserNotes(id: string, notes: string) {
    return patchData<AdminUser>(`/users/${id}/notes`, { notes });
  },
  updateUserStatus(id: string, status: UserStatus) {
    return patchData<AdminUser>(`/users/${id}/status`, { status });
  },
  updateUserRole(id: string, role: 'ADMIN' | 'CUSTOMER') {
    return patchData<AdminUser>(`/users/${id}/role`, { role });
  },
  verifyUser(id: string) {
    return postData<AdminUser>(`/users/${id}/verify`);
  },
  resetUserPassword(id: string) {
    return postData<{ sent: boolean }>(`/users/${id}/reset-password`);
  },
  restoreUser(id: string) {
    return postData<AdminUser>(`/users/${id}/restore`);
  },
  bulkUsers(body: { ids: string[]; action: BulkUserAction }) {
    return postData<{ processed: number; skipped: string[] }>('/users/bulk', body);
  },
  createAdmin(body: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone: string;
  }) {
    return postData<AdminUser>('/users/admins', body);
  },
  deleteUser(id: string) {
    return deleteData(`/users/${id}`);
  },

  getAnalyticsOverview() {
    return getData<AnalyticsOverview>('/admin/analytics/overview');
  },
  getSales(params?: { granularity?: 'day' | 'month'; from?: string; to?: string }) {
    return getData<SalesPoint[]>('/admin/analytics/sales', { params });
  },
  getBestsellers(limit = 10) {
    return getData<Bestseller[]>('/admin/analytics/products/bestsellers', {
      params: { limit },
    });
  },
  getCustomerAnalytics() {
    return getData<CustomerAnalytics>('/admin/analytics/customers/summary');
  },
  getInventoryAnalytics() {
    return getData<InventoryAnalytics>('/admin/analytics/inventory');
  },
  createReportExport(body: {
    type: ReportExportType;
    format: ReportExportFormat;
    params?: { from?: string; to?: string };
  }) {
    return postData<ReportExportJob>('/admin/reports/exports', body);
  },
  getReportExport(id: string) {
    return getData<ReportExportJob>(`/admin/reports/exports/${id}`);
  },
  async downloadReportExport(id: string, fileName: string) {
    const response = await apiClient.get<Blob>(`/admin/reports/exports/${id}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  },
};

export type { AdminReturnStatus };
