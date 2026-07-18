/** Storefront money helpers. DB stores BIGINT poisha; APIs expose integer taka. */

export function takaToPoisha(taka: number): bigint {
  return BigInt(Math.round(taka * 100));
}

export function poishaToTaka(poisha: bigint | number): number {
  return Number(poisha) / 100;
}

export const STANDARD_SHIPPING_POISHA = 12_000n;

/** Maintains product discount projections when price windows change. */
export function computeDiscountProjection(
  amountPoisha: bigint,
  compareAtPoisha: bigint | null,
): { discountPercent: number; onSale: boolean } {
  if (compareAtPoisha == null || compareAtPoisha <= amountPoisha) {
    return { discountPercent: 0, onSale: false };
  }
  const discountPercent = Math.round(
    (Number(compareAtPoisha - amountPoisha) / Number(compareAtPoisha)) * 100,
  );
  return { discountPercent, onSale: true };
}
