import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BannerPlacement,
  BannerStatus,
  type MarketingBanner,
  type Prisma,
} from '@/generated/prisma/client';
import { buildOffsetMeta, resolveOffsetPagination } from '@/common/pagination/offset-pagination';
import type { CreateBannerDto, ListAdminBannersQueryDto, UpdateBannerDto } from './dto/banner.dto';
import { MarketingRepository } from './marketing.repository';

@Injectable()
export class MarketingService {
  constructor(private readonly banners: MarketingRepository) {}

  listPublic(placement: BannerPlacement, now = new Date()) {
    return this.banners.listPublic(placement, now);
  }

  async listAdmin(query: ListAdminBannersQueryDto) {
    const { page, pageSize, skip, take } = resolveOffsetPagination(query);
    const { rows, total } = await this.banners.listAdmin({ skip, take });
    return { data: rows, meta: buildOffsetMeta(page, pageSize, total) };
  }

  async getAdmin(id: string) {
    const banner = await this.banners.findById(id);
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }

  create(dto: CreateBannerDto) {
    this.assertWindow(dto.startsAt, dto.endsAt);
    return this.banners.create(this.toCreateData(dto));
  }

  async update(id: string, dto: UpdateBannerDto) {
    const existing = await this.getAdmin(id);
    this.assertWindow(
      dto.startsAt ?? existing.startsAt?.toISOString(),
      dto.endsAt === undefined ? existing.endsAt?.toISOString() : dto.endsAt,
    );
    return this.banners.update(id, this.toUpdateData(dto));
  }

  async delete(id: string): Promise<void> {
    await this.getAdmin(id);
    await this.banners.delete(id);
  }

  private assertWindow(startsAt?: string, endsAt?: string | null): void {
    if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
      throw new BadRequestException('Banner end date must be after its start date');
    }
  }

  private toCreateData(dto: CreateBannerDto): Prisma.MarketingBannerCreateInput {
    return {
      placement: dto.placement,
      status: dto.status ?? BannerStatus.DRAFT,
      title: dto.title.trim(),
      subtitle: dto.subtitle?.trim() || null,
      ctaLabel: dto.ctaLabel?.trim() || null,
      ctaHref: dto.ctaHref?.trim() || null,
      imageUrl: dto.imageUrl.trim(),
      mobileImageUrl: dto.mobileImageUrl?.trim() || null,
      position: dto.position ?? 0,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
    };
  }

  private toUpdateData(dto: UpdateBannerDto): Prisma.MarketingBannerUpdateInput {
    return {
      ...(dto.placement !== undefined ? { placement: dto.placement } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.subtitle !== undefined ? { subtitle: dto.subtitle.trim() || null } : {}),
      ...(dto.ctaLabel !== undefined ? { ctaLabel: dto.ctaLabel.trim() || null } : {}),
      ...(dto.ctaHref !== undefined ? { ctaHref: dto.ctaHref.trim() || null } : {}),
      ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl.trim() } : {}),
      ...(dto.mobileImageUrl !== undefined
        ? { mobileImageUrl: dto.mobileImageUrl.trim() || null }
        : {}),
      ...(dto.position !== undefined ? { position: dto.position } : {}),
      ...(dto.startsAt !== undefined
        ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null }
        : {}),
      ...(dto.endsAt !== undefined ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null } : {}),
    };
  }
}

export function isBannerActive(
  banner: Pick<MarketingBanner, 'status' | 'startsAt' | 'endsAt' | 'deletedAt'>,
  now: Date,
): boolean {
  return (
    !banner.deletedAt &&
    (banner.status === BannerStatus.ACTIVE || banner.status === BannerStatus.SCHEDULED) &&
    (!banner.startsAt || banner.startsAt <= now) &&
    (!banner.endsAt || banner.endsAt >= now)
  );
}
