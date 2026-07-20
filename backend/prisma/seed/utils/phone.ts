const BD_MOBILE_PATTERN = /^(?:\+?880|0)(1[3-9]\d{8})$/;

/** Normalize a Bangladeshi mobile number to E.164 (`+8801XXXXXXXXX`). */
export function normalizeBdPhone(raw: string): string {
  const match = BD_MOBILE_PATTERN.exec(raw.replace(/[\s-]/g, ''));
  if (!match) {
    throw new Error(`Invalid Bangladeshi mobile number: ${raw}`);
  }
  return `+880${match[1]}`;
}
