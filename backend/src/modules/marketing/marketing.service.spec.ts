import { BannerStatus } from '@/generated/prisma/client';
import { isBannerActive } from './marketing.service';

describe('marketing banner active window', () => {
  const now = new Date('2026-07-19T04:00:00.000Z');

  it('includes active and currently scheduled banners', () => {
    expect(
      isBannerActive(
        {
          status: BannerStatus.SCHEDULED,
          startsAt: new Date('2026-07-19T03:00:00.000Z'),
          endsAt: new Date('2026-07-19T05:00:00.000Z'),
          deletedAt: null,
        },
        now,
      ),
    ).toBe(true);
  });

  it('excludes future, expired, draft, and deleted banners', () => {
    const common = { status: BannerStatus.ACTIVE, deletedAt: null };
    expect(isBannerActive({ ...common, startsAt: new Date('2026-07-20'), endsAt: null }, now)).toBe(
      false,
    );
    expect(isBannerActive({ ...common, startsAt: null, endsAt: new Date('2026-07-18') }, now)).toBe(
      false,
    );
    expect(
      isBannerActive(
        { ...common, status: BannerStatus.DRAFT, startsAt: null, endsAt: null },
        now,
      ),
    ).toBe(false);
    expect(
      isBannerActive({ ...common, startsAt: null, endsAt: null, deletedAt: new Date() }, now),
    ).toBe(false);
  });
});
