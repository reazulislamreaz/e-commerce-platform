import axios from 'axios';

/**
 * Canonical shopper-facing error copy. Keep in sync with backend
 * `USER_FACING` messages where possible.
 */
export const USER_FACING_ERRORS = {
  SESSION_ENDED:
    "For your security, you've been signed out because your login session ended. Please log in again to continue.",
  PLEASE_LOG_IN: 'Please log in to continue.',
  NO_PERMISSION: "You don't have permission to do that.",
  INVALID_CREDENTIALS: 'The email or password you entered is incorrect. Please try again.',
  ACCOUNT_INACTIVE: 'This account is no longer active. Please contact support if you need help.',
  ACCOUNT_SUSPENDED: 'Your account has been suspended. Please contact support for help.',
  EMAIL_NOT_VERIFIED:
    'Please verify your email address before signing in. Check your inbox for the link.',
  EMAIL_ALREADY_REGISTERED:
    'An account with this email already exists. Try logging in or use a different email address.',
  PHONE_ALREADY_REGISTERED:
    'An account with this mobile number already exists. Try logging in or use a different number.',
  VALIDATION: 'Please check the highlighted information and try again.',
  INTERNAL: 'Something unexpected happened on our side. Please try again later.',
  GENERIC: "We couldn't complete your request right now. Please try again in a moment.",
  NETWORK:
    "We couldn't connect to the server. Please check your internet connection and try again.",
  NOT_FOUND: "We couldn't find what you're looking for.",
  CONFLICT: 'That conflicts with existing information. Please check and try again.',
  TOO_MANY_REQUESTS: 'Too many requests. Please wait a moment and try again.',
  INVALID_COUPON:
    'This coupon code is invalid or has expired. Please check the code and try again.',
  OUT_OF_STOCK:
    'This item is currently out of stock. Please choose a different option or try again later.',
  CART_EMPTY: 'Your bag is empty. Add items before continuing.',
  ITEMS_UNAVAILABLE:
    'Some items in your bag are no longer available. Please review your bag and try again.',
  COUPON_REQUIRES_LOGIN: 'Please log in to use a coupon code.',
  VERIFICATION_LINK: 'This verification link is invalid or has expired. Please request a new one.',
  ALREADY_VERIFIED: 'This email address has already been verified. You can sign in.',
  RESET_LINK: 'This password reset link is invalid or has expired. Please request a new one.',
  CURRENT_PASSWORD_INCORRECT: 'The current password you entered is incorrect. Please try again.',
  PASSWORD_MUST_DIFFER: 'Your new password must be different from your current password.',
  CONSENT_REQUIRED: 'Please confirm marketing consent to subscribe.',
  SIGN_IN_FAILED: "We couldn't sign you in right now. Please try again.",
  REGISTER_FAILED: "We couldn't create your account. Please check your details and try again.",
  ORDER_FAILED: "We couldn't place your order right now. Please try again in a moment.",
} as const;

/** API / auth messages that should never be shown raw to shoppers. */
const MESSAGE_MAP: Record<string, string> = {
  'Invalid email or password': USER_FACING_ERRORS.INVALID_CREDENTIALS,
  'Email and password do not match.': USER_FACING_ERRORS.INVALID_CREDENTIALS,
  'Email and password do not match': USER_FACING_ERRORS.INVALID_CREDENTIALS,
  'Invalid refresh token': USER_FACING_ERRORS.SESSION_ENDED,
  'Refresh token has been revoked': USER_FACING_ERRORS.SESSION_ENDED,
  'Refresh token is required': USER_FACING_ERRORS.SESSION_ENDED,
  'Your session expired. Please sign in again.': USER_FACING_ERRORS.SESSION_ENDED,
  'Email is already registered': USER_FACING_ERRORS.EMAIL_ALREADY_REGISTERED,
  'An account with this email already exists. Please sign in or reset your password.':
    USER_FACING_ERRORS.EMAIL_ALREADY_REGISTERED,
  'Phone number is already registered': USER_FACING_ERRORS.PHONE_ALREADY_REGISTERED,
  'This mobile number is already registered. Please sign in or use a different number.':
    USER_FACING_ERRORS.PHONE_ALREADY_REGISTERED,
  'Account is suspended': USER_FACING_ERRORS.ACCOUNT_SUSPENDED,
  'Account is no longer active': USER_FACING_ERRORS.ACCOUNT_INACTIVE,
  Unauthorized: USER_FACING_ERRORS.PLEASE_LOG_IN,
  Forbidden: USER_FACING_ERRORS.NO_PERMISSION,
  'Forbidden resource': USER_FACING_ERRORS.NO_PERMISSION,
  'Bad Request': USER_FACING_ERRORS.VALIDATION,
  'Not Found': USER_FACING_ERRORS.NOT_FOUND,
  Conflict: USER_FACING_ERRORS.CONFLICT,
  'Too Many Requests': USER_FACING_ERRORS.TOO_MANY_REQUESTS,
  'Internal server error': USER_FACING_ERRORS.INTERNAL,
  'Internal Server Error': USER_FACING_ERRORS.INTERNAL,
  'Validation failed': USER_FACING_ERRORS.VALIDATION,
  'Network Error': USER_FACING_ERRORS.NETWORK,
  'network error': USER_FACING_ERRORS.NETWORK,
  'Unknown Error': USER_FACING_ERRORS.GENERIC,
  'Something went wrong': USER_FACING_ERRORS.GENERIC,
  'Something went wrong. Please try again.': USER_FACING_ERRORS.GENERIC,
  'Invalid or expired coupon code.': USER_FACING_ERRORS.INVALID_COUPON,
  'Invalid or expired coupon code': USER_FACING_ERRORS.INVALID_COUPON,
  'Invalid coupon': USER_FACING_ERRORS.INVALID_COUPON,
  'Variant is out of stock': USER_FACING_ERRORS.OUT_OF_STOCK,
  'Cart is empty': USER_FACING_ERRORS.CART_EMPTY,
  'One or more items are unavailable': USER_FACING_ERRORS.ITEMS_UNAVAILABLE,
  'Sign in to apply coupons': USER_FACING_ERRORS.COUPON_REQUIRES_LOGIN,
  'Sign in to use coupons.': USER_FACING_ERRORS.COUPON_REQUIRES_LOGIN,
  'Verification link is invalid or has expired.': USER_FACING_ERRORS.VERIFICATION_LINK,
  'Verification link is invalid or has expired': USER_FACING_ERRORS.VERIFICATION_LINK,
  'Reset link is invalid or has expired.': USER_FACING_ERRORS.RESET_LINK,
  'Reset link is invalid or has expired': USER_FACING_ERRORS.RESET_LINK,
  'Current password is incorrect.': USER_FACING_ERRORS.CURRENT_PASSWORD_INCORRECT,
  'Current password is incorrect': USER_FACING_ERRORS.CURRENT_PASSWORD_INCORRECT,
  'New password must be different from the current password':
    USER_FACING_ERRORS.PASSWORD_MUST_DIFFER,
  'Consent is required to subscribe': USER_FACING_ERRORS.CONSENT_REQUIRED,
  'Product not found': "We couldn't find this product.",
  'Order not found': "We couldn't find this order. Please check the details and try again.",
  'Address not found': "We couldn't find that address. Please refresh and try again.",
  'Cart not found': "We couldn't find your bag. Please refresh and try again.",
  'Variant not found': "We couldn't find that product option. Please refresh and try again.",
  'You already reviewed this product': 'You have already reviewed this product.',
  'Return window has expired': 'The return window for this order has ended.',
  'Order must be delivered before requesting a return':
    'You can request a return after your order has been delivered.',
  'You must attest that items are unworn with tags attached':
    'Please confirm that the items are unworn with tags attached before continuing.',
  'An active return request already exists for this order':
    'A return or exchange request is already in progress for this order.',
  'Sale items are exchange only': 'Sale items can only be exchanged, not returned for a refund.',
  'Image file is required': 'Please choose an image to upload.',
  'Image must be 8 MB or smaller': 'Images must be 8 MB or smaller. Please choose a smaller file.',
  'Only JPEG, PNG, or WebP images are allowed': 'Please upload a JPEG, PNG, or WebP image.',
  'jwt expired': USER_FACING_ERRORS.SESSION_ENDED,
  'jwt malformed': USER_FACING_ERRORS.PLEASE_LOG_IN,
  'invalid token': USER_FACING_ERRORS.PLEASE_LOG_IN,
  'No auth token': USER_FACING_ERRORS.PLEASE_LOG_IN,
};

const TECHNICAL_PATTERNS: RegExp[] = [
  /\brefresh token\b/i,
  /\baccess token\b/i,
  /\bjwt\b/i,
  /\btokenhash\b/i,
  /\bprisma\b/i,
  /\bmongo\b/i,
  /\bpostgres\b/i,
  /\beconnrefused\b/i,
  /\bstatus code\b/i,
  /\brequest failed\b/i,
  /\bnetwork error\b/i,
  /^error:/i,
  /\bexception\b/i,
  /\bstack\b/i,
  /\bat\s+\w+\s*\(/i,
  /P\d{4}/,
  /\bECONN\w+\b/i,
  /\bSQL\b/,
  /^[A-Z][A-Za-z]+Exception$/,
];

const STATUS_FALLBACK: Partial<Record<number, string>> = {
  400: USER_FACING_ERRORS.VALIDATION,
  401: USER_FACING_ERRORS.PLEASE_LOG_IN,
  403: USER_FACING_ERRORS.NO_PERMISSION,
  404: USER_FACING_ERRORS.NOT_FOUND,
  409: USER_FACING_ERRORS.CONFLICT,
  429: USER_FACING_ERRORS.TOO_MANY_REQUESTS,
  500: USER_FACING_ERRORS.INTERNAL,
  502: USER_FACING_ERRORS.INTERNAL,
  503: USER_FACING_ERRORS.INTERNAL,
};

function isTechnicalMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;
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
      return USER_FACING_ERRORS.NETWORK;
    }
    const status = error.response.status;
    const data = error.response.data as
      { message?: string | string[]; details?: string[] } | undefined;
    const raw = data?.message;
    const message = Array.isArray(raw) ? raw[0] : raw;
    if (typeof message === 'string' && message.trim()) {
      return (
        mapKnownMessage(message) ??
        (isTechnicalMessage(message) ? (STATUS_FALLBACK[status] ?? fallback) : message)
      );
    }
    // Prefer first validation detail when the top-level message is empty.
    const detail = data?.details?.[0];
    if (typeof detail === 'string' && detail.trim() && !isTechnicalMessage(detail)) {
      return mapKnownMessage(detail) ?? detail;
    }
    return STATUS_FALLBACK[status] ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return (
      mapKnownMessage(error.message) ??
      (isTechnicalMessage(error.message) ? fallback : error.message)
    );
  }

  if (typeof error === 'string' && error.trim()) {
    return mapKnownMessage(error) ?? (isTechnicalMessage(error) ? fallback : error.trim());
  }

  return fallback;
}
