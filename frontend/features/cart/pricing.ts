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

/** Free delivery threshold used across cart, checkout, and marketing. */
export const FREE_SHIPPING_THRESHOLD = 1999;
export const STANDARD_SHIPPING_FEE = 120;

export function shippingForSubtotal(subtotal: number, forceFree = false): number {
  if (forceFree || subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return STANDARD_SHIPPING_FEE;
}

export function amountUntilFreeShipping(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
}
