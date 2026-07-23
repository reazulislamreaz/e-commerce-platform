import { Injectable } from '@nestjs/common';
import { NewsletterStatus, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export type NewsletterSubscriptionRecord = Prisma.NewsletterSubscriptionGetPayload<object>;

@Injectable()
export class NewsletterRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<NewsletterSubscriptionRecord | null> {
    return this.prisma.newsletterSubscription.findUnique({ where: { email } });
  }

  findByTokenHash(tokenHash: string): Promise<NewsletterSubscriptionRecord | null> {
    return this.prisma.newsletterSubscription.findUnique({
      where: { unsubscribeTokenHash: tokenHash },
    });
  }

  findById(id: string): Promise<NewsletterSubscriptionRecord | null> {
    return this.prisma.newsletterSubscription.findUnique({ where: { id } });
  }

  upsertActive(
    data: {
      email: string;
      userId?: string | null;
      consentTextVersion: string;
      unsubscribeTokenHash: string;
      source?: string | null;
      ipHash?: string | null;
    },
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<NewsletterSubscriptionRecord> {
    const now = new Date();
    return tx.newsletterSubscription.upsert({
      where: { email: data.email },
      create: {
        email: data.email,
        userId: data.userId ?? null,
        status: NewsletterStatus.ACTIVE,
        consentAt: now,
        consentTextVersion: data.consentTextVersion,
        unsubscribeTokenHash: data.unsubscribeTokenHash,
        source: data.source ?? null,
        ipHash: data.ipHash ?? null,
      },
      update: {
        userId: data.userId ?? null,
        status: NewsletterStatus.ACTIVE,
        consentAt: now,
        consentTextVersion: data.consentTextVersion,
        unsubscribeTokenHash: data.unsubscribeTokenHash,
        source: data.source ?? null,
        ipHash: data.ipHash ?? null,
        unsubscribedAt: null,
      },
    });
  }

  markUnsubscribed(
    id: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<NewsletterSubscriptionRecord> {
    return tx.newsletterSubscription.update({
      where: { id },
      data: {
        status: NewsletterStatus.UNSUBSCRIBED,
        unsubscribedAt: new Date(),
      },
    });
  }

  async listAdmin(query: {
    skip: number;
    take: number;
    status?: NewsletterStatus;
  }): Promise<{ rows: NewsletterSubscriptionRecord[]; total: number }> {
    const where: Prisma.NewsletterSubscriptionWhereInput = { status: query.status };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.newsletterSubscription.count({ where }),
      this.prisma.newsletterSubscription.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: query.skip,
        take: query.take,
      }),
    ]);
    return { rows, total };
  }

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
