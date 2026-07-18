import type { CartItem } from '@/store/slices/cart-slice';
import type { CatalogProduct } from '@/features/products/types';

export interface CartLine {
  item: CartItem;
  product: CatalogProduct;
}

export function resolveCartLines(items: CartItem[], products: CatalogProduct[]): CartLine[] {
  const byId = new Map<string, CatalogProduct>();
  for (const product of products) {
    byId.set(product.id, product);
    if (product.legacyId) byId.set(product.legacyId, product);
  }
  const lines: CartLine[] = [];
  for (const item of items) {
    const product = byId.get(item.productId);
    if (product) lines.push({ item, product });
  }
  return lines;
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.product.price * line.item.quantity, 0);
}

export const STANDARD_SHIPPING_FEE = 120;

/** Shipping fee for checkout. `forceFree` is for promo coupons only. */
export function shippingForSubtotal(subtotal: number, forceFree = false): number {
  if (forceFree || subtotal === 0) return 0;
  return STANDARD_SHIPPING_FEE;
}
