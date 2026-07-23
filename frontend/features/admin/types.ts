export type AdminOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'exchanged';

export type AdminReturnStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type AdminReviewStatus = 'pending' | 'published' | 'rejected';
export type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'SPAM';
export type NewsletterStatus = 'ACTIVE' | 'UNSUBSCRIBED';
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';
export type CustomerSegment = 'NEW' | 'ONE_TIME' | 'ACTIVE' | 'HIGH_VALUE' | 'AT_RISK' | 'DORMANT';

export type CursorPage<T> = {
  data: T[];
  meta: { limit: number; nextCursor: string | null };
};

export type OffsetPageMeta = {
  page: number;
  pageSize: number;
  limit: number;
  total: number;
  totalPages: number;
  nextCursor?: string | null;
};

export type OffsetPage<T> = {
  data: T[];
  meta: OffsetPageMeta;
};

export type UserListSort =
  | 'CREATED_DESC'
  | 'CREATED_ASC'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'LAST_LOGIN_DESC'
  | 'ORDERS_DESC'
  | 'SPENDING_DESC';

export type BulkUserAction = 'ACTIVATE' | 'SUSPEND' | 'VERIFY' | 'SOFT_DELETE' | 'RESTORE';

export type AdminUserListParams = {
  page?: number;
  limit?: number;
  role?: AdminRole | string;
  status?: UserStatus | string;
  search?: string;
  sort?: UserListSort | string;
  createdFrom?: string;
  createdTo?: string;
  verified?: boolean;
  deleted?: boolean;
};

export type AdminOrder = {
  id: string;
  number: string;
  createdAt: string;
  updatedAt?: string;
  status: AdminOrderStatus;
  items: Array<{
    orderItemId?: string;
    productId: string;
    variantId?: string;
    name: string;
    slug: string;
    image: string;
    sku?: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
    lineTotal?: number;
  }>;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  couponCode?: string;
  shippingAddress: {
    id: string;
    label: string;
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    district: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
    type: 'shipping' | 'billing';
  };
  paymentMethod: 'cod';
  paymentStatus?: 'pending' | 'collected' | 'cancelled' | string;
  trackingNumber?: string;
  shipment?: {
    deliveryPartnerId?: string | null;
    deliveryPartnerName?: string | null;
    deliveryPartnerLogoUrl?: string | null;
    carrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    shippingNote?: string | null;
    shippedAt?: string | null;
    assignedAt?: string | null;
    estimatedDeliveryAt?: string | null;
    assignedBy?: { id: string; fullName: string } | null;
  } | null;
  timeline: Array<{ label: string; at: string; done: boolean }>;
  statusHistory?: Array<{
    status: string;
    note?: string | null;
    createdAt: string;
    actor?: { id: string; fullName: string } | null;
  }>;
  email?: string;
  phone?: string;
  notes?: string | null;
  customerName?: string;
  confirmedAt?: string | null;
  processingAt?: string | null;
  packedAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  userId?: string;
};

export type AdminOrderSort =
  'CREATED_DESC' | 'CREATED_ASC' | 'TOTAL_DESC' | 'TOTAL_ASC' | 'UPDATED_DESC';

export type AdminOrderListParams = {
  page?: number;
  limit?: number;
  pageSize?: number;
  search?: string;
  number?: string;
  phone?: string;
  email?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  deliveryPartnerId?: string;
  createdFrom?: string;
  createdTo?: string;
  sort?: AdminOrderSort | string;
};

export type OrdersSummary = {
  totalOrders: number;
  pending: number;
  confirmed: number;
  processing: number;
  packed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  returned: number;
  exchanged: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  totalRevenue: number;
  averageOrderValue: number;
};

export type BulkOrderAction =
  'CONFIRM' | 'START_PROCESSING' | 'MARK_PACKED' | 'SHIP' | 'CANCEL' | 'EXPORT';

export type BulkOrdersResult = {
  processed: number;
  succeeded: string[];
  failed: Array<{ id: string; reason: string }>;
  csv?: string;
};

export type DeliveryPartner = {
  id: string;
  companyName: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  trackingUrlTemplate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  shipmentCount?: number;
};

export type DeliveryPartnerInput = {
  companyName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  trackingUrlTemplate?: string;
  isActive?: boolean;
};

export type AdminReturn = {
  id: string;
  orderId: string;
  orderNumber: string;
  reason: string;
  status: AdminReturnStatus;
  createdAt: string;
  type: 'return' | 'exchange';
  items: Array<{ orderItemId: string; quantity: number }>;
};

export type AdminReview = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  verified: boolean;
  status: AdminReviewStatus;
  publishedAt?: string;
  authorName: string;
  userId?: string;
};

export type InventoryBalance = {
  id: string;
  variantId: string;
  variantSku: string;
  locationId: string;
  locationCode: string;
  onHand: number;
  reserved: number;
  available: number;
  version: number;
  updatedAt: string;
};

export type InventoryLocation = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type InventoryMovement = {
  id: string;
  variantId: string;
  locationId: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  note?: string | null;
  createdAt: string;
};

export type StockAlert = {
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
};

export type AdminCoupon = {
  id: string;
  code: string;
  title: string;
  description: string;
  rewardType: 'percent' | 'fixed' | 'free_shipping';
  value?: number | null;
  minOrderTaka: number;
  startsAt: string;
  endsAt?: string | null;
  maxRedemptionsPerUser: number;
  maxRedemptionsGlobal?: number | null;
  status: string;
  redemptionCount?: number;
};

export type AdminProductSort =
  | 'UPDATED_DESC'
  | 'CREATED_DESC'
  | 'CREATED_ASC'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'PRICE_ASC'
  | 'PRICE_DESC';

export type AdminStockFilter = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export type AdminProductListParams = {
  page?: number;
  limit?: number;
  status?: ProductStatus | string;
  q?: string;
  brandId?: string;
  categoryId?: string;
  stock?: AdminStockFilter | string;
  sort?: AdminProductSort | string;
};

export type AdminProductStats = {
  total: number;
  active: number;
  draft: number;
  archived: number;
  outOfStock: number;
  lowStock: number;
};

export type AdminProductSummary = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  brandName: string;
  priceTaka: number;
  variantCount: number;
  imageUrl?: string;
  sku?: string;
  categoryName?: string;
  /** Aggregate available stock across variants — present on list responses. */
  totalStock?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminProductDetail = AdminProductSummary & {
  brandId: string;
  description: string;
  primaryColor: string;
  categoryIds: string[];
  collectionIds: string[];
  colors: Array<{ id: string; name: string; hex: string; position: number }>;
  variants: Array<{
    id: string;
    sku: string;
    size: string;
    color: string;
    position: number;
    isActive: boolean;
  }>;
  media: Array<{
    id: string;
    url: string;
    alt: string;
    position: number;
    isPrimary: boolean;
  }>;
  activePrice?: {
    id: string;
    amountTaka: number;
    compareAtTaka?: number;
    validFrom: string;
    validTo?: string;
  };
  isNew: boolean;
  featuredPosition: number;
  onSale: boolean;
  discountPercent: number;
};

export type CreateAdminProductInput = {
  slug?: string;
  name: string;
  brandId: string;
  description: string;
  primaryColor: string;
  categoryIds: string[];
  colors: Array<{ name: string; hex: string }>;
  variants: Array<{ sku: string; size: string; color: string; openingQuantity?: number }>;
  inventoryLocationId?: string;
  collectionIds?: string[];
  media: Array<{ url: string; alt: string; position?: number; isPrimary: boolean }>;
  price: { amountTaka: number; compareAtTaka?: number };
};

export type UpdateAdminProductInput = Partial<
  Pick<
    CreateAdminProductInput,
    | 'name'
    | 'brandId'
    | 'description'
    | 'primaryColor'
    | 'categoryIds'
    | 'colors'
    | 'variants'
    | 'media'
  > & {
    slug: string;
    collectionIds: string[];
    featuredPosition: number;
    isNew: boolean;
  }
>;

export type AdminBrand = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  position: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminCollection = {
  id: string;
  name: string;
  slug: string;
  position: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  status: ContactStatus;
  adminNotes?: string | null;
  createdAt: string;
};

export type NewsletterSubscription = {
  id: string;
  email: string;
  status: NewsletterStatus;
  createdAt: string;
  unsubscribedAt?: string | null;
};

export type AdminUser = {
  id: string;
  email: string;
  phone: string;
  role: AdminRole;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
  emailVerifiedAt?: string | null;
  emailVerified: boolean;
  registrationMethod: 'EMAIL';
  lastLoginAt?: string | null;
  orderCount: number;
  totalSpending: number;
  adminNotes?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserAddress = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  district: string;
  postalCode: string;
  country: string;
  type: 'SHIPPING' | 'BILLING';
  isDefault: boolean;
};

export type AdminUserDetail = AdminUser & {
  shippingAddresses: AdminUserAddress[];
  billingAddresses: AdminUserAddress[];
  orders: Array<{
    id: string;
    number: string;
    status: string;
    itemCount: number;
    total: number;
    createdAt: string;
  }>;
  wishlist: Array<{
    productId: string;
    name: string;
    slug: string;
    imageUrl?: string;
    addedAt: string;
  }>;
  reviews: Array<{
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    rating: number;
    title: string;
    status: string;
    createdAt: string;
  }>;
  activity: Array<{
    id: string;
    eventType: string;
    title: string;
    href?: string;
    createdAt: string;
  }>;
  loginHistory: Array<{
    id: string;
    ip: string | null;
    userAgent: string | null;
    rememberMe: boolean;
    createdAt: string;
    lastSeenAt: string;
    expiresAt: string;
    revokedAt: string | null;
    active: boolean;
  }>;
  auditTrail: Array<{
    id: string;
    action: string;
    resourceType: string;
    resourceId: string;
    actorUserId: string | null;
    actorRole: string | null;
    createdAt: string;
  }>;
};

export type AnalyticsOverview = {
  totalRevenue: number;
  totalOrders: number;
  ordersToday: number;
  revenueToday: number;
  revenue7d: number;
  revenue30d: number;
  deltas: {
    ordersToday: number | null;
    revenueToday: number | null;
    revenue7d: number | null;
    revenue30d: number | null;
  };
  currencyCode: 'BDT';
};

export type SalesPoint = { bucket: string; revenue: number; orders: number };

export type Bestseller = {
  productId: string;
  name: string;
  slug: string;
  units: number;
  revenue: number;
};

export type CustomerAnalytics = {
  totalCustomers: number;
  newCustomers: number;
  highValueCount: number;
  highValueThreshold: number;
  topCustomers: Array<{
    id: string;
    email: string;
    name: string;
    orderCount: number;
    lifetimeValue: number;
  }>;
};

export type InventoryAnalytics = {
  lowStockCount: number;
  outOfStockCount: number;
  topLowSkus: Array<{
    variantId: string;
    sku: string;
    productName: string;
    available: number;
    threshold: number;
  }>;
};

export type ReportExportType = 'REVENUE' | 'ORDERS' | 'PRODUCTS' | 'CUSTOMERS' | 'INVENTORY';
export type ReportExportFormat = 'CSV' | 'XLSX';
export type ReportExportJob = {
  id: string;
  type: ReportExportType;
  format: ReportExportFormat;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  fileName: string | null;
  errorMessage: string | null;
  rowCount: number | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
};

export type CustomerMetrics = {
  orderCount: number;
  deliveredOrderCount: number;
  lifetimeValue: number;
  averageOrderValue: number;
  lastOrderAt?: string;
  firstOrderAt?: string;
  cancelledOrderCount: number;
  returnCount: number;
  wishlistItemCount: number;
  segment: CustomerSegment;
};

export type AdminCustomer = {
  id: string;
  email: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  status: UserStatus;
  createdAt: string;
  metrics: CustomerMetrics;
};

export type CustomerOrderHistory = {
  id: string;
  number: string;
  status: string;
  itemCount: number;
  total: number;
  createdAt: string;
};

export type CustomerActivity = {
  id: string;
  eventType: string;
  title: string;
  href?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type CustomerSegmentSummary = {
  segment: CustomerSegment;
  count: number;
};
