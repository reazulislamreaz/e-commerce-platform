export type AdminOrderStatus =
  'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

export type AdminReturnStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type AdminReviewStatus = 'pending' | 'published' | 'rejected';
export type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'SPAM';
export type NewsletterStatus = 'ACTIVE' | 'UNSUBSCRIBED';
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';

export type CursorPage<T> = {
  data: T[];
  meta: { limit: number; nextCursor: string | null };
};

export type AdminOrder = {
  id: string;
  number: string;
  createdAt: string;
  status: AdminOrderStatus;
  items: Array<{
    productId: string;
    name: string;
    slug: string;
    image: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
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
  trackingNumber?: string;
  timeline: Array<{ label: string; at: string; done: boolean }>;
  email?: string;
  userId?: string;
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

export type AdminProductSummary = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  brandName: string;
  priceTaka: number;
  variantCount: number;
  publishedAt?: string;
  updatedAt: string;
};

export type AdminProductDetail = AdminProductSummary & {
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
  name: string;
  brandId: string;
  description: string;
  primaryColor: string;
  categoryIds: string[];
  colors: Array<{ name: string; hex: string }>;
  variants: Array<{ sku: string; size: string; color: string }>;
  media: Array<{ url: string; alt: string; isPrimary: boolean }>;
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
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
};

export type AdminCollection = {
  id: string;
  name: string;
  slug: string;
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
  createdAt: string;
  updatedAt: string;
};
