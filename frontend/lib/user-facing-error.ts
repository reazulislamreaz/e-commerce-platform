import axios from 'axios';

/** API / auth messages that should never be shown raw to shoppers. */
const MESSAGE_MAP: Record<string, string> = {
  'Invalid email or password': 'Email and password do not match.',
  'Invalid refresh token': 'Your session expired. Please sign in again.',
  'Refresh token has been revoked': 'Your session expired. Please sign in again.',
  'Refresh token is required': 'Your session expired. Please sign in again.',
  'Email is already registered':
    'An account with this email already exists. Please sign in or reset your password.',
  'Phone number is already registered':
    'This mobile number is already registered. Please sign in or use a different number.',
  'Account is suspended': 'Your account has been suspended. Please contact support.',
  Unauthorized: 'Please sign in to continue.',
  'Internal server error': 'Something went wrong. Please try again.',
  'Internal Server Error': 'Something went wrong. Please try again.',
};

const TECHNICAL_PATTERNS: RegExp[] = [
  /\brefresh token\b/i,
  /\baccess token\b/i,
  /\bjwt\b/i,
  /\btokenhash\b/i,
  /\bprisma\b/i,
  /\beconnrefused\b/i,
  /\bstatus code\b/i,
  /\brequest failed\b/i,
  /\bnetwork error\b/i,
  /^error:/i,
  /\bexception\b/i,
  /\bstack\b/i,
  /\bat\s+\w+\s*\(/i,
];

function isTechnicalMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;
  // Axios / fetch default noise
  if (/^Request failed with status code \d+/i.test(trimmed)) return true;
  return false;
}

function mapKnownMessage(message: string): string | undefined {
  const exact = MESSAGE_MAP[message];
  if (exact) return exact;
  const normalized = message.trim();
  for (const [key, value] of Object.entries(MESSAGE_MAP)) {
    if (key.toLowerCase() === normalized.toLowerCase()) return value;
  }
  return undefined;
}

/**
 * Turns API / thrown errors into short copy a shopper can understand.
 * Never returns raw transport, token, or stack messages.
 */
export function getUserFacingErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Network error. Check your connection and try again.';
    }
    const data = error.response.data as { message?: string | string[] } | undefined;
    const raw = data?.message;
    const message = Array.isArray(raw) ? raw[0] : raw;
    if (typeof message === 'string' && message.trim()) {
      return mapKnownMessage(message) ?? (isTechnicalMessage(message) ? fallback : message);
    }
    return fallback;
  }

  if (error instanceof Error && error.message) {
    return (
      mapKnownMessage(error.message) ??
      (isTechnicalMessage(error.message) ? fallback : error.message)
    );
  }

  return fallback;
}
