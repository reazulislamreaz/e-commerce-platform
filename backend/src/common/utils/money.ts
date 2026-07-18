/** Storefront money helpers. DB stores BIGINT poisha; APIs expose integer taka. */

export function takaToPoisha(taka: number): bigint {
  return BigInt(Math.round(taka * 100));
}

export function poishaToTaka(poisha: bigint | number): number {
  return Number(poisha) / 100;
}

export const STANDARD_SHIPPING_POISHA = 12_000n;
