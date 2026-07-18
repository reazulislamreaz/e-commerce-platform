import { createHash, randomBytes } from 'node:crypto';

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function requestBodyHash(body: unknown): string {
  return sha256Hex(JSON.stringify(body ?? null));
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function generateOrderNumber(): string {
  return `EA${randomBytes(4).toString('hex').toUpperCase()}`;
}

export function generateTrackingNumber(): string {
  return `TRK${randomBytes(5).toString('hex').toUpperCase()}`;
}
