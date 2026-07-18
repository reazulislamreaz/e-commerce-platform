import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsentAction, ConsentPurpose, NewsletterStatus } from '@/generated/prisma/client';
import { generateOpaqueToken, sha256Hex } from '@/common/utils/hash';
import { AuditService } from '@/modules/platform/audit.service';
import { OUTBOX_EVENT, OutboxService } from '@/modules/platform/outbox.service';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import type { ListNewsletterSubscriptionsQueryDto } from './dto/list-newsletter.query.dto';
import type {
  NewsletterSubscribeResponseDto,
  NewsletterSubscriptionResponseDto,
  NewsletterUnsubscribeResponseDto,
} from './dto/newsletter-response.dto';
import type { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { NewsletterRepository, type NewsletterSubscriptionRecord } from './newsletter.repository';

const CONSENT_TEXT_VERSION = 'v1';
const SUBSCRIBE_MESSAGE = 'You are subscribed to Elevate Apparel updates.';
const UNSUBSCRIBE_MESSAGE = 'You have been unsubscribed.';

@Injectable()
export class NewsletterService {
  constructor(
    private readonly newsletter: NewsletterRepository,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async subscribe(
    dto: SubscribeNewsletterDto,
    actor: JwtPayload | undefined,
    meta: { ip?: string; userAgent?: string },
  ): Promise<NewsletterSubscribeResponseDto> {
    if (dto.consent !== true) {
      throw new BadRequestException('Consent is required to subscribe');
    }

    const token = generateOpaqueToken();
    const tokenHash = sha256Hex(token);
    const frontendOrigin = this.config.getOrThrow<string>('FRONTEND_ORIGIN').replace(/\/$/, '');
    const unsubscribeUrl = `${frontendOrigin}/unsubscribe?token=${token}`;

    await this.newsletter.runTransaction(async (tx) => {
      const subscription = await this.newsletter.upsertActive(
        {
          email: dto.email,
          userId: actor?.sub ?? null,
          consentTextVersion: CONSENT_TEXT_VERSION,
          unsubscribeTokenHash: tokenHash,
          source: dto.source?.trim() || null,
          ipHash: meta.ip ? sha256Hex(meta.ip) : null,
        },
        tx,
      );

      await tx.consentEvent.create({
        data: {
          userId: actor?.sub ?? null,
          email: dto.email,
          purpose: ConsentPurpose.NEWSLETTER,
          action: ConsentAction.GRANTED,
          source: dto.source?.trim() || 'newsletter_signup',
          ip: meta.ip ?? null,
          userAgent: meta.userAgent?.slice(0, 500) ?? null,
        },
      });

      await this.outbox.enqueue(
        OUTBOX_EVENT.NEWSLETTER_WELCOME_EMAIL,
        subscription.id,
        {
          to: dto.email,
          unsubscribeUrl,
        },
        tx,
      );
    });

    return { message: SUBSCRIBE_MESSAGE };
  }

  async unsubscribe(token: string): Promise<NewsletterUnsubscribeResponseDto> {
    const tokenHash = sha256Hex(token.trim());
    const subscription = await this.newsletter.findByTokenHash(tokenHash);

    if (subscription && subscription.status === NewsletterStatus.ACTIVE) {
      await this.newsletter.runTransaction(async (tx) => {
        await this.newsletter.markUnsubscribed(subscription.id, tx);
        await tx.consentEvent.create({
          data: {
            userId: subscription.userId,
            email: subscription.email,
            purpose: ConsentPurpose.NEWSLETTER,
            action: ConsentAction.WITHDRAWN,
            source: 'newsletter_unsubscribe',
          },
        });
      });
    }

    return { message: UNSUBSCRIBE_MESSAGE };
  }

  listAdmin(query: ListNewsletterSubscriptionsQueryDto) {
    return this.newsletter.listAdmin(query).then((rows) => this.toCursorPage(rows, query.limit));
  }

  async adminUnsubscribe(actor: JwtPayload, id: string): Promise<NewsletterSubscriptionResponseDto> {
    const current = await this.newsletter.findById(id);
    if (!current) throw new NotFoundException('Newsletter subscription not found');

    const updated = await this.newsletter.runTransaction(async (tx) => {
      const row = await this.newsletter.markUnsubscribed(id, tx);

      if (current.status !== NewsletterStatus.UNSUBSCRIBED) {
        await tx.consentEvent.create({
          data: {
            userId: current.userId,
            email: current.email,
            purpose: ConsentPurpose.NEWSLETTER,
            action: ConsentAction.WITHDRAWN,
            source: 'admin_unsubscribe',
          },
        });
      }

      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: 'newsletter.unsubscribe',
          resourceType: 'newsletter_subscription',
          resourceId: id,
          before: { status: current.status },
          after: { status: NewsletterStatus.UNSUBSCRIBED },
        },
        tx,
      );

      return row;
    });

    return toResponse(updated);
  }

  private toCursorPage(rows: NewsletterSubscriptionRecord[], limit: number) {
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

function toResponse(row: NewsletterSubscriptionRecord): NewsletterSubscriptionResponseDto {
  return {
    id: row.id,
    email: row.email,
    status: mapStatusToApi(row.status),
    consentAt: row.consentAt.toISOString(),
    ...(row.source ? { source: row.source } : {}),
    createdAt: row.createdAt.toISOString(),
    ...(row.unsubscribedAt ? { unsubscribedAt: row.unsubscribedAt.toISOString() } : {}),
  };
}

function mapStatusToApi(status: NewsletterStatus): NewsletterSubscriptionResponseDto['status'] {
  switch (status) {
    case NewsletterStatus.BOUNCED:
      return 'bounced';
    case NewsletterStatus.UNSUBSCRIBED:
      return 'unsubscribed';
    default:
      return 'active';
  }
}
