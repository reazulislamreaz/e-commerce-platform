import { createHash } from 'node:crypto';

/**
 * Deterministic UUID v4-shaped id from a stable seed key.
 * Safe for repeated upserts; never use for security-sensitive tokens.
 */
export function seedUuid(key: string): string {
  const digest = createHash('sha256').update(`elevate-apparel:seed:v1:${key}`).digest('hex');
  const bytes = Buffer.from(digest.slice(0, 32), 'hex');
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function seedOrderNumber(index: number): string {
  return `EASEED${String(index).padStart(4, '0')}`;
}

export function seedTrackingNumber(orderNumber: string): string {
  return `TRKSEED${orderNumber.replace(/^EA/, '')}`;
}
