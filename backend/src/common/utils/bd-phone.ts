/**
 * Bangladeshi mobile numbers: operator prefix 01[3-9] followed by 8 digits.
 * Accepted inputs (spaces/hyphens tolerated): 01712345678, 8801712345678,
 * +8801712345678. Stored canonically in E.164: +8801712345678.
 */
const BD_MOBILE_PATTERN = /^(?:\+?880|0)(1[3-9]\d{8})$/;

/** Returns the E.164 form (+8801XXXXXXXXX) or null when invalid. */
export function normalizeBdPhone(input: string): string | null {
  const compact = input.replace(/[\s-]/g, '');
  const match = BD_MOBILE_PATTERN.exec(compact);
  return match ? `+880${match[1]}` : null;
}
