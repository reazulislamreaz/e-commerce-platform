import type { CartItem } from '@/store/slices/cart-slice';
import type { CatalogProduct } from '@/features/products/types';
import { getProductById } from '@/features/products';

export interface CartLine {
  item: CartItem;
  product: CatalogProduct;
}

export function resolveCartLines(items: CartItem[]): CartLine[] {
  const lines: CartLine[] = [];
  for (const item of items) {
    const product = getProductById(item.productId);
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
