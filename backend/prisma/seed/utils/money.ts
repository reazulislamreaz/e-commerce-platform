export function takaToPoisha(taka: number): bigint {
  return BigInt(Math.round(taka * 100));
}

export const STANDARD_SHIPPING_POISHA = 12_000n;
