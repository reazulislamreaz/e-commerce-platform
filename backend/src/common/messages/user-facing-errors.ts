/**
 * Canonical user-facing API error copy. Prefer these constants at throw sites;
 * {@link toUserFacingMessage} is a final safety net in the HTTP exception filter.
 */

export const USER_FACING = {
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
  NOT_FOUND: "We couldn't find what you're looking for.",
  CONFLICT: 'That conflicts with existing information. Please check and try again.',
  TOO_MANY_REQUESTS: 'Too many requests. Please wait a moment and try again.',
  BAD_REQUEST: 'Please check the information you entered and try again.',
  NETWORK_HINT: "We couldn't complete your request right now. Please try again in a moment.",
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
  CART_NOT_FOUND: "We couldn't find your bag. Please refresh and try again.",
  PRODUCT_NOT_FOUND: "We couldn't find this product.",
  ORDER_NOT_FOUND: "We couldn't find this order. Please check the details and try again.",
  ADDRESS_NOT_FOUND: "We couldn't find that address. Please refresh and try again.",
  VARIANT_NOT_FOUND: "We couldn't find that product option. Please refresh and try again.",
  REVIEW_EXISTS: 'You have already reviewed this product.',
  RETURN_WINDOW_EXPIRED: 'The return window for this order has ended.',
  RETURN_REQUIRES_DELIVERY: 'You can request a return after your order has been delivered.',
  RETURN_ATTESTATION:
    'Please confirm that the items are unworn with tags attached before continuing.',
  RETURN_ALREADY_ACTIVE: 'A return or exchange request is already in progress for this order.',
  RETURN_ITEMS_INVALID:
    'One or more selected items cannot be returned for this order. Please check and try again.',
  SALE_EXCHANGE_ONLY: 'Sale items can only be exchanged, not returned for a refund.',
  IMAGE_REQUIRED: 'Please choose an image to upload.',
  IMAGE_TOO_LARGE: 'Images must be 8 MB or smaller. Please choose a smaller file.',
  IMAGE_TYPE: 'Please upload a JPEG, PNG, or WebP image.',
} as const;

/** Nest / Passport defaults and legacy strings → friendly copy. */
const MESSAGE_MAP: Record<string, string> = {
  Unauthorized: USER_FACING.PLEASE_LOG_IN,
  UnauthorizedException: USER_FACING.PLEASE_LOG_IN,
  Forbidden: USER_FACING.NO_PERMISSION,
  'Forbidden resource': USER_FACING.NO_PERMISSION,
  ForbiddenException: USER_FACING.NO_PERMISSION,
  'Bad Request': USER_FACING.BAD_REQUEST,
  'Bad Request Exception': USER_FACING.BAD_REQUEST,
  'Not Found': USER_FACING.NOT_FOUND,
  'Not Found Exception': USER_FACING.NOT_FOUND,
  Conflict: USER_FACING.CONFLICT,
  'Too Many Requests': USER_FACING.TOO_MANY_REQUESTS,
  'Internal server error': USER_FACING.INTERNAL,
  'Internal Server Error': USER_FACING.INTERNAL,
  'Validation failed': USER_FACING.VALIDATION,
  'Your session expired. Please sign in again.': USER_FACING.SESSION_ENDED,
  'Invalid refresh token': USER_FACING.SESSION_ENDED,
  'Refresh token has been revoked': USER_FACING.SESSION_ENDED,
  'Refresh token is required': USER_FACING.SESSION_ENDED,
  'Invalid email or password': USER_FACING.INVALID_CREDENTIALS,
  'Email and password do not match.': USER_FACING.INVALID_CREDENTIALS,
  'Email and password do not match': USER_FACING.INVALID_CREDENTIALS,
  'Account is no longer active': USER_FACING.ACCOUNT_INACTIVE,
  'Account is suspended': USER_FACING.ACCOUNT_SUSPENDED,
  'Email is already registered': USER_FACING.EMAIL_ALREADY_REGISTERED,
  'An account with this email already exists. Please sign in or reset your password.':
    USER_FACING.EMAIL_ALREADY_REGISTERED,
  'Phone number is already registered': USER_FACING.PHONE_ALREADY_REGISTERED,
  'This mobile number is already registered. Please sign in or use a different number.':
    USER_FACING.PHONE_ALREADY_REGISTERED,
  'Invalid or expired coupon code.': USER_FACING.INVALID_COUPON,
  'Invalid or expired coupon code': USER_FACING.INVALID_COUPON,
  'Variant is out of stock': USER_FACING.OUT_OF_STOCK,
  'Cart is empty': USER_FACING.CART_EMPTY,
  'Cart not found': USER_FACING.CART_NOT_FOUND,
  'One or more items are unavailable': USER_FACING.ITEMS_UNAVAILABLE,
  'Sign in to apply coupons': USER_FACING.COUPON_REQUIRES_LOGIN,
  'Verification link is invalid or has expired': USER_FACING.VERIFICATION_LINK,
  'This email address has already been verified': USER_FACING.ALREADY_VERIFIED,
  'Reset link is invalid or has expired': USER_FACING.RESET_LINK,
  'Current password is incorrect': USER_FACING.CURRENT_PASSWORD_INCORRECT,
  'New password must be different from the current password': USER_FACING.PASSWORD_MUST_DIFFER,
  'Consent is required to subscribe': USER_FACING.CONSENT_REQUIRED,
  'Product not found': USER_FACING.PRODUCT_NOT_FOUND,
  'Order not found': USER_FACING.ORDER_NOT_FOUND,
  'User not found': "We couldn't find that account.",
  'Address not found': USER_FACING.ADDRESS_NOT_FOUND,
  'Coupon not found': "We couldn't find that coupon.",
  'Review not found': "We couldn't find that review.",
  'Notification not found': "We couldn't find that notification.",
  'Variant not found': USER_FACING.VARIANT_NOT_FOUND,
  'Return request not found': "We couldn't find that return request.",
  'You already reviewed this product': USER_FACING.REVIEW_EXISTS,
  'Return window has expired': USER_FACING.RETURN_WINDOW_EXPIRED,
  'Order must be delivered before requesting a return': USER_FACING.RETURN_REQUIRES_DELIVERY,
  'You must attest that items are unworn with tags attached': USER_FACING.RETURN_ATTESTATION,
  'An active return request already exists for this order': USER_FACING.RETURN_ALREADY_ACTIVE,
  'One or more return items are invalid for this order': USER_FACING.RETURN_ITEMS_INVALID,
  'Sale items are exchange only': USER_FACING.SALE_EXCHANGE_ONLY,
  'One or more exchange variants are unavailable':
    'One or more exchange options are unavailable. Please choose different options.',
  'Image file is required': USER_FACING.IMAGE_REQUIRED,
  'Image must be 8 MB or smaller': USER_FACING.IMAGE_TOO_LARGE,
  'Only JPEG, PNG, or WebP images are allowed': USER_FACING.IMAGE_TYPE,
  'File content is not a valid JPEG, PNG, or WebP image': USER_FACING.IMAGE_TYPE,
  'File content does not match its declared image type': USER_FACING.IMAGE_TYPE,
  'You are not allowed to access this account': USER_FACING.NO_PERMISSION,
  'You are not allowed to assign this role': USER_FACING.NO_PERMISSION,
  'You are not allowed to manage this account': USER_FACING.NO_PERMISSION,
  'You cannot manage your own account from this endpoint':
    'You cannot change your own account from this screen. Ask another admin for help.',
  'Coupon code already exists':
    'A coupon with this code already exists. Please use a different code.',
  'Could not allocate an order number; please retry':
    "We couldn't create your order number right now. Please try again in a moment.",
  'Inventory version conflict; refresh and retry':
    'Stock was updated by someone else. Please refresh and try again.',
  'quantityDelta must be non-zero': 'Enter a non-zero quantity to adjust stock.',
  'jwt expired': USER_FACING.SESSION_ENDED,
  'jwt malformed': USER_FACING.PLEASE_LOG_IN,
  'invalid token': USER_FACING.PLEASE_LOG_IN,
  'No auth token': USER_FACING.PLEASE_LOG_IN,
  'invalid signature': USER_FACING.PLEASE_LOG_IN,
};

const TECHNICAL_PATTERNS: RegExp[] = [
  /\bprisma\b/i,
  /\beconnrefused\b/i,
  /\bpostgres\b/i,
  /\bmongodb\b/i,
  /\bstack\b/i,
  /\bexception\b/i,
  /\btokenhash\b/i,
  /\baccess token\b/i,
  /\brefresh token\b/i,
  /\bjwt\b/i,
  /\bstatus code\b/i,
  /\brequest failed\b/i,
  /^error:/i,
  /\bat\s+\w+\s*\(/i,
  /P\d{4}/, // Prisma error codes
  /\bECONN\w+\b/i,
  /\bSQL\b/,
];

const STATUS_FALLBACK: Partial<Record<number, string>> = {
  400: USER_FACING.BAD_REQUEST,
  401: USER_FACING.PLEASE_LOG_IN,
  403: USER_FACING.NO_PERMISSION,
  404: USER_FACING.NOT_FOUND,
  409: USER_FACING.CONFLICT,
  429: USER_FACING.TOO_MANY_REQUESTS,
  500: USER_FACING.INTERNAL,
  502: USER_FACING.INTERNAL,
  503: USER_FACING.INTERNAL,
};

function isTechnicalMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;
  if (/^Request failed with status code \d+/i.test(trimmed)) return true;
  // Raw Nest exception class names
  if (/^[A-Z][A-Za-z]+Exception$/i.test(trimmed)) return true;
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
 * Ensures API `message` is safe, clear, and actionable for end users.
 */
export function toUserFacingMessage(raw: string | undefined, statusCode: number): string {
  if (!raw?.trim()) {
    return STATUS_FALLBACK[statusCode] ?? USER_FACING.INTERNAL;
  }
  const mapped = mapKnownMessage(raw);
  if (mapped) return mapped;
  if (isTechnicalMessage(raw)) {
    return STATUS_FALLBACK[statusCode] ?? USER_FACING.NETWORK_HINT;
  }
  return raw.trim();
}

/** Soften class-validator field messages before they reach clients in `details`. */
export function toUserFacingValidationDetail(detail: string): string {
  const mapped = mapKnownMessage(detail);
  if (mapped) return mapped;

  const replacements: Array<[RegExp, string]> = [
    [/^email must be an email$/i, 'Enter a valid email address.'],
    [/^password must be longer than or equal to \d+ characters$/i, 'Password is too short.'],
    [
      /^password must contain a lowercase letter, an uppercase letter, and a digit$/i,
      'Password must include an uppercase letter, a lowercase letter, and a digit.',
    ],
    [
      /^phone must be a valid Bangladeshi mobile number.*$/i,
      'Enter a valid Bangladeshi mobile number, e.g. 01712345678.',
    ],
    [/^.* should not be empty$/i, 'This field is required.'],
    [/^.* must be a string$/i, 'Please enter valid text for this field.'],
    [/^.* must be a number.*$/i, 'Please enter a valid number.'],
    [/^.* must be an integer.*$/i, 'Please enter a whole number.'],
    [/^.* must be a boolean$/i, 'Please choose a valid option.'],
    [/^.* must be a UUID$/i, 'Something looks incorrect. Please refresh and try again.'],
    [/^property .+ should not exist$/i, 'Please remove unexpected fields and try again.'],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(detail)) return replacement;
  }

  if (isTechnicalMessage(detail)) return USER_FACING.VALIDATION;
  return detail;
}
