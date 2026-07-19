import { Injectable } from '@nestjs/common';
import { BannerPlacement, BannerStatus, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class MarketingRepository {
  constructor(private readonly prisma: PrismaService) {}

  listPublic(placement: BannerPlacement, now: Date) {
    return this.prisma.marketingBanner.findMany({
      where: {
        placement,
        status: { in: [BannerStatus.ACTIVE, BannerStatus.SCHEDULED] },
        deletedAt: null,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });
  }

  listAdmin() {
    return this.prisma.marketingBanner.findMany({
      where: { deletedAt: null },
      orderBy: [{ placement: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findById(id: string) {
    return this.prisma.marketingBanner.findFirst({ where: { id, deletedAt: null } });
  }

  create(data: Prisma.MarketingBannerCreateInput) {
    return this.prisma.marketingBanner.create({ data });
  }

  update(id: string, data: Prisma.MarketingBannerUpdateInput) {
    return this.prisma.marketingBanner.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.marketingBanner.update({
      where: { id },
      data: { deletedAt: new Date(), status: BannerStatus.ARCHIVED },
    });
  }
}
