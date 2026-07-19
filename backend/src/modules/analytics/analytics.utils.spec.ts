import { enumerateBuckets, percentageDelta, resolveDateRange } from './analytics.utils';

describe('analytics helpers', () => {
  describe('percentageDelta', () => {
    it('calculates positive and negative changes', () => {
      expect(percentageDelta(125n, 100n)).toBe(25);
      expect(percentageDelta(75n, 100n)).toBe(-25);
    });

    it('does not invent a percentage when the previous period is empty', () => {
      expect(percentageDelta(10n, 0n)).toBeNull();
      expect(percentageDelta(0n, 0n)).toBe(0);
    });
  });

  describe('enumerateBuckets', () => {
    it('enumerates inclusive UTC day buckets across month boundaries', () => {
      const buckets = enumerateBuckets(
        new Date('2026-01-30T18:00:00.000Z'),
        new Date('2026-02-02T04:00:00.000Z'),
        'day',
      );
      expect(buckets.map((bucket) => bucket.toISOString().slice(0, 10))).toEqual([
        '2026-01-30',
        '2026-01-31',
        '2026-02-01',
        '2026-02-02',
      ]);
    });

    it('enumerates inclusive month buckets across years', () => {
      const buckets = enumerateBuckets(
        new Date('2025-11-15T00:00:00.000Z'),
        new Date('2026-02-01T00:00:00.000Z'),
        'month',
      );
      expect(buckets.map((bucket) => bucket.toISOString().slice(0, 7))).toEqual([
        '2025-11',
        '2025-12',
        '2026-01',
        '2026-02',
      ]);
    });
  });

  describe('resolveDateRange', () => {
    it('defaults to a trailing 30 calendar-day window', () => {
      const now = new Date('2026-07-19T12:00:00.000Z');
      const range = resolveDateRange(undefined, undefined, now);
      expect(range.to).toEqual(now);
      expect(range.from).toEqual(new Date('2026-06-20T12:00:00.000Z'));
    });

    it('rejects reversed and excessive ranges', () => {
      expect(() => resolveDateRange('2026-02-01', '2026-01-01')).toThrow(
        '"from" must be earlier',
      );
      expect(() => resolveDateRange('2020-01-01', '2026-01-01')).toThrow(
        'cannot exceed two years',
      );
    });
  });
});
