export type PeriodValues = { current: bigint; previous: bigint };

export function percentageDelta(current: bigint, previous: bigint): number | null {
  if (previous === 0n) return current === 0n ? 0 : null;
  return Number(((current - previous) * 10_000n) / previous) / 100;
}

export function resolveDateRange(
  from: string | undefined,
  to: string | undefined,
  now = new Date(),
): { from: Date; to: Date } {
  const upper = to ? new Date(to) : now;
  const lower = from ? new Date(from) : new Date(upper.getTime() - 29 * 86_400_000);
  if (lower >= upper) throw new RangeError('"from" must be earlier than "to"');
  if (upper.getTime() - lower.getTime() > 2 * 366 * 86_400_000) {
    throw new RangeError('Analytics range cannot exceed two years');
  }
  return { from: lower, to: upper };
}

export function enumerateBuckets(
  from: Date,
  to: Date,
  granularity: 'day' | 'month',
): Date[] {
  const cursor =
    granularity === 'month'
      ? new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1))
      : new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end =
    granularity === 'month'
      ? new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1))
      : new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  const buckets: Date[] = [];
  while (cursor <= end) {
    buckets.push(new Date(cursor));
    if (granularity === 'month') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return buckets;
}
