import {
  ContactMessageStatus,
  NewsletterStatus,
  ConsentAction,
  ConsentPurpose,
} from '../../../src/generated/prisma/client';
import { sha256Hex } from '../utils/hash';
import { seedUuid } from '../utils/ids';
import type { SeedContext } from '../types';
import { seedLog } from '../utils/logger';

export async function seedContactAndNewsletter(ctx: SeedContext): Promise<void> {
  const { prisma, users } = ctx;

  const messages: Array<{
    key: string;
    name: string;
    email: string;
    subject: string;
    body: string;
    status: ContactMessageStatus;
    userId?: string;
  }> = [
    {
      key: 'contact:sizing',
      name: 'Tasnim Haque',
      email: 'tasnim.haque@example.com',
      subject: 'Sizing for oversized tee',
      body: 'Do the oversized tees run large compared to the essential tee? Looking at an L.',
      status: ContactMessageStatus.NEW,
    },
    {
      key: 'contact:shipping',
      name: users.customers[0]
        ? `${users.customers[0].firstName} ${users.customers[0].lastName}`
        : 'Rahim Khan',
      email: users.customers[0]?.email ?? 'rahim.khan@elevateapparel.demo',
      subject: 'Delivery window to Dhanmondi',
      body: 'Can Pathao deliver on Friday evenings to Dhanmondi Road 4?',
      status: ContactMessageStatus.IN_PROGRESS,
      userId: users.customers[0]?.id,
    },
    {
      key: 'contact:resolved',
      name: 'Guest Shopper',
      email: 'guest.shopper@example.com',
      subject: 'Fabric care for hoodies',
      body: 'Any guidance on washing the heavyweight hoodies?',
      status: ContactMessageStatus.RESOLVED,
    },
  ];

  for (const message of messages) {
    const id = seedUuid(message.key);
    await prisma.contactMessage.upsert({
      where: { id },
      create: {
        id,
        name: message.name,
        email: message.email,
        subject: message.subject,
        body: message.body,
        status: message.status,
        userId: message.userId ?? null,
        resolvedAt:
          message.status === ContactMessageStatus.RESOLVED
            ? new Date('2026-06-10T00:00:00.000Z')
            : null,
        adminNotes:
          message.status === ContactMessageStatus.RESOLVED
            ? 'Replied with care card PDF.'
            : null,
        ipHash: sha256Hex(`seed-ip:${message.key}`),
        userAgent: 'ElevateSeed/1.0',
      },
      update: {
        name: message.name,
        subject: message.subject,
        body: message.body,
        status: message.status,
      },
    });
  }

  const newsletterEmails = [
    ...users.customers.slice(0, 4).map((c) => ({ email: c.email, userId: c.id as string | null })),
    { email: 'press@elevateapparel.demo', userId: null as string | null },
  ];

  for (const entry of newsletterEmails) {
    const tokenHash = sha256Hex(`seed:newsletter:unsub:${entry.email}`);
    await prisma.newsletterSubscription.upsert({
      where: { email: entry.email },
      create: {
        id: seedUuid(`newsletter:${entry.email}`),
        email: entry.email,
        userId: entry.userId,
        status: NewsletterStatus.ACTIVE,
        consentAt: new Date('2026-02-01T00:00:00.000Z'),
        consentTextVersion: 'newsletter-v1',
        unsubscribeTokenHash: tokenHash,
        source: 'seed:v1',
      },
      update: {
        userId: entry.userId,
        status: NewsletterStatus.ACTIVE,
        consentTextVersion: 'newsletter-v1',
        unsubscribedAt: null,
      },
    });

    const consent = await prisma.consentEvent.findFirst({
      where: {
        email: entry.email,
        purpose: ConsentPurpose.NEWSLETTER,
        action: ConsentAction.GRANTED,
        source: 'seed:v1',
      },
      select: { id: true },
    });
    if (!consent) {
      await prisma.consentEvent.create({
        data: {
          userId: entry.userId,
          email: entry.email,
          purpose: ConsentPurpose.NEWSLETTER,
          action: ConsentAction.GRANTED,
          source: 'seed:v1',
        },
      });
    }
  }

  seedLog(
    `Seeded ${messages.length} contact messages and ${newsletterEmails.length} newsletter subscriptions.`,
  );
}
