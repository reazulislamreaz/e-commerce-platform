import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReviewStatus } from '@/generated/prisma/client';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { AuditService } from '@/modules/platform/audit.service';
import type { AdminReviewActionDto } from './dto/admin-review-action.dto';
import type { CreateReviewDto } from './dto/create-review.dto';
import type { ListReviewsQueryDto } from './dto/list-reviews.query.dto';
import type { ReviewResponseDto } from './dto/review-response.dto';
import type { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsRepository, type ReviewDetailRecord } from './reviews.repository';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviews: ReviewsRepository,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateReviewDto): Promise<ReviewResponseDto> {
    return this.reviews.runTransaction(async (tx) => {
      const product = await this.reviews.findActiveProduct(dto.productId, tx);
      if (!product) throw new NotFoundException('Product not found');

      const purchase = await this.reviews.findDeliveredPurchase(userId, dto.productId, tx);
      if (!purchase) {
        throw new BadRequestException(
          'You can only review products from your delivered orders',
        );
      }

      const existing = await this.reviews.findActiveByUserAndProduct(userId, dto.productId, tx);
      if (existing) {
        throw new ConflictException('You already reviewed this product');
      }

      const user = await this.reviews.findUserAuthorName(userId, tx);
      const authorName = buildAuthorName(user);

      const created = await this.reviews.create(
        {
          product: { connect: { id: dto.productId } },
          user: { connect: { id: userId } },
          authorName,
          rating: dto.rating,
          title: dto.title.trim(),
          body: dto.body.trim(),
          verified: true,
          status: ReviewStatus.PENDING,
        },
        tx,
      );

      return toResponse(created);
    });
  }

  async listMine(userId: string, query: ListReviewsQueryDto) {
    const rows = await this.reviews.listByUserId(userId, query);
    return this.toCursorPage(rows, query.limit);
  }

  async getMine(userId: string, id: string): Promise<ReviewResponseDto> {
    const row = await this.reviews.findById(id);
    if (!row || row.userId !== userId) throw new NotFoundException('Review not found');
    return toResponse(row);
  }

  async update(userId: string, id: string, dto: UpdateReviewDto): Promise<ReviewResponseDto> {
    return this.reviews.runTransaction(async (tx) => {
      const current = await this.reviews.findById(id, tx);
      if (!current || current.userId !== userId) {
        throw new NotFoundException('Review not found');
      }

      const wasPublished = current.status === ReviewStatus.PUBLISHED;
      const updated = await this.reviews.update(
        id,
        {
          ...(dto.rating != null ? { rating: dto.rating } : {}),
          ...(dto.title != null ? { title: dto.title.trim() } : {}),
          ...(dto.body != null ? { body: dto.body.trim() } : {}),
          ...(wasPublished
            ? { status: ReviewStatus.PENDING, publishedAt: null }
            : {}),
        },
        tx,
      );

      if (wasPublished) {
        await this.reviews.recomputeProductAggregates(current.productId, tx);
      }

      return toResponse(updated);
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.reviews.runTransaction(async (tx) => {
      const current = await this.reviews.findById(id, tx);
      if (!current || current.userId !== userId) {
        throw new NotFoundException('Review not found');
      }

      await this.reviews.softDelete(id, tx);
      if (current.status === ReviewStatus.PUBLISHED) {
        await this.reviews.recomputeProductAggregates(current.productId, tx);
      }
    });
  }

  async listAdmin(query: ListReviewsQueryDto) {
    const rows = await this.reviews.listAdmin(query);
    return this.toCursorPage(rows, query.limit);
  }

  async getAdmin(id: string): Promise<ReviewResponseDto> {
    const row = await this.reviews.findById(id);
    if (!row) throw new NotFoundException('Review not found');
    return toResponse(row);
  }

  async publish(
    actor: JwtPayload,
    id: string,
    dto: AdminReviewActionDto,
  ): Promise<ReviewResponseDto> {
    return this.reviews.runTransaction(async (tx) => {
      const current = await this.reviews.findById(id, tx);
      if (!current) throw new NotFoundException('Review not found');
      if (current.status === ReviewStatus.PUBLISHED) {
        throw new BadRequestException('Review is already published');
      }

      const updated = await this.reviews.update(
        id,
        {
          status: ReviewStatus.PUBLISHED,
          publishedAt: new Date(),
        },
        tx,
      );

      await this.reviews.recomputeProductAggregates(current.productId, tx);

      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: 'review.publish',
          resourceType: 'product_review',
          resourceId: id,
          before: { status: current.status },
          after: { status: ReviewStatus.PUBLISHED, note: dto.note ?? null },
        },
        tx,
      );

      return toResponse(updated);
    });
  }

  async reject(
    actor: JwtPayload,
    id: string,
    dto: AdminReviewActionDto,
  ): Promise<ReviewResponseDto> {
    return this.reviews.runTransaction(async (tx) => {
      const current = await this.reviews.findById(id, tx);
      if (!current) throw new NotFoundException('Review not found');
      if (current.status === ReviewStatus.REJECTED) {
        throw new BadRequestException('Review is already rejected');
      }

      const wasPublished = current.status === ReviewStatus.PUBLISHED;
      const updated = await this.reviews.update(
        id,
        {
          status: ReviewStatus.REJECTED,
          publishedAt: null,
        },
        tx,
      );

      if (wasPublished) {
        await this.reviews.recomputeProductAggregates(current.productId, tx);
      }

      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: 'review.reject',
          resourceType: 'product_review',
          resourceId: id,
          before: { status: current.status },
          after: { status: ReviewStatus.REJECTED, note: dto.note ?? null },
        },
        tx,
      );

      return toResponse(updated);
    });
  }

  /** Exposed for unit tests of aggregate math. */
  computeRatingAverageCenti(ratings: number[]): number {
    if (ratings.length === 0) return 0;
    const avg = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    return Math.round(avg * 100);
  }

  private toCursorPage(rows: ReviewDetailRecord[], limit: number) {
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      data: page.map(toResponse),
      meta: {
        limit,
        nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      },
    };
  }
}

export function toResponse(row: ReviewDetailRecord): ReviewResponseDto {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.product.name,
    productSlug: row.product.slug,
    rating: row.rating,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    verified: row.verified,
    status: mapStatusToApi(row.status),
    ...(row.publishedAt ? { publishedAt: row.publishedAt.toISOString() } : {}),
    authorName: row.authorName,
    ...(row.userId ? { userId: row.userId } : {}),
  };
}

export function mapStatusToApi(status: ReviewStatus): ReviewResponseDto['status'] {
  return status.toLowerCase() as ReviewResponseDto['status'];
}

function buildAuthorName(
  user: { firstName: string | null; lastName: string | null; email: string } | null,
): string {
  if (!user) return 'Customer';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  const local = user.email.split('@')[0]?.trim();
  return local && local.length > 0 ? local : 'Customer';
}
