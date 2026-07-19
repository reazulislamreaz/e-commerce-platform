import 'dotenv/config';
import * as argon2 from 'argon2';
import { ValidationPipe, VersioningType, RequestMethod } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { ReviewStatus, Role, UserStatus } from '@/generated/prisma/client';

async function recomputeAggregates(prisma: PrismaService, productId: string): Promise<void> {
  const aggregates = await prisma.productReview.aggregate({
    where: { productId, status: ReviewStatus.PUBLISHED, deletedAt: null },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      reviewCount: aggregates._count._all,
      ratingAverage:
        aggregates._count._all === 0 || aggregates._avg.rating == null
          ? 0
          : Math.round(aggregates._avg.rating * 100),
    },
  });
}

const SMOKE_AUTHOR = 'Review Smoke';

describe('Review moderation smoke (HTTP)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let smokeProductId: string | null = null;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.setGlobalPrefix('api', {
      exclude: [
        { path: 'docs', method: RequestMethod.ALL },
        { path: 'docs/{*path}', method: RequestMethod.ALL },
      ],
    });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  }, 60_000);

  afterAll(async () => {
    // Remove reviews created by this smoke flow (including leftovers from prior
    // runs) so repeated executions don't pollute the seeded catalog dataset.
    if (prisma) {
      const polluted = await prisma.productReview.findMany({
        where: { authorName: SMOKE_AUTHOR },
        select: { productId: true },
        distinct: ['productId'],
      });
      await prisma.productReview.deleteMany({ where: { authorName: SMOKE_AUTHOR } });
      for (const { productId } of polluted) {
        await recomputeAggregates(prisma, productId);
      }
      if (smokeProductId && !polluted.some((row) => row.productId === smokeProductId)) {
        await recomputeAggregates(prisma, smokeProductId);
      }
    }
    await app?.close();
  });

  it('creates a pending review from a delivered purchase, then publishes it to PDP', async () => {
    const adminEmail = process.env.SEED_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;
    expect(adminEmail).toBeTruthy();
    expect(adminPassword).toBeTruthy();

    const stamp = Date.now();
    const customerEmail = `review-smoke+${stamp}@example.com`;
    const customerPassword = 'ReviewSmokePass123!';
    const phoneSuffix = String(stamp).slice(-8).padStart(8, '0');
    const customerPhone = `+88017${phoneSuffix}`;

    await prisma.user.create({
      data: {
        email: customerEmail,
        phone: customerPhone,
        passwordHash: await argon2.hash(customerPassword),
        role: Role.CUSTOMER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        firstName: 'Review',
        lastName: 'Smoke',
      },
    });

    const product = await prisma.product.findFirst({
      where: { slug: 'elevate-oversized-tee', deletedAt: null },
      include: {
        variants: {
          where: { isActive: true, deletedAt: null },
          include: { inventoryBalances: true },
          take: 20,
        },
      },
    });
    expect(product).toBeTruthy();
    smokeProductId = product!.id;
    const variant = product!.variants.find((row) =>
      row.inventoryBalances.some((balance) => balance.onHand - balance.reserved > 0),
    );
    expect(variant).toBeTruthy();

    const customerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: customerEmail, password: customerPassword })
      .expect(200);
    const customerToken = customerLogin.body.data.accessToken as string;
    expect(customerToken).toBeTruthy();

    const placed = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', `review-smoke-order-${stamp}`)
      .send({
        fullName: 'Review Smoke',
        phone: customerPhone,
        email: customerEmail,
        line1: 'House 9, Road 2',
        city: 'Dhaka',
        district: 'Dhaka',
        postalCode: '1205',
        paymentMethod: 'cod',
        items: [{ variantId: variant!.id, quantity: 1 }],
      })
      .expect(201);

    const orderId = placed.body.data.id as string;
    expect(orderId).toBeTruthy();

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    const adminToken = adminLogin.body.data.accessToken as string;
    expect(adminToken).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PROCESSING' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PACKED' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'SHIPPED',
        trackingNumber: `TRK-REV-${stamp}`,
        carrier: 'Pathao',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DELIVERED' })
      .expect(200);

    const createdReview = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId: product!.id,
        rating: 5,
        title: 'Smoke review',
        body: 'Verified purchase review created by automated smoke coverage.',
      })
      .expect(201);

    expect(createdReview.body.data.status).toBe('pending');
    expect(createdReview.body.data.verified).toBe(true);
    const reviewId = createdReview.body.data.id as string;

    const beforePublish = await request(app.getHttpServer())
      .get(`/api/v1/products/${product!.slug}`)
      .expect(200);
    const beforeIds = (beforePublish.body.data.reviews as Array<{ id: string }>).map(
      (row) => row.id,
    );
    expect(beforeIds).not.toContain(reviewId);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/reviews/${reviewId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Smoke publish' })
      .expect(200);

    const afterPublish = await request(app.getHttpServer())
      .get(`/api/v1/products/${product!.slug}`)
      .expect(200);

    const published = (afterPublish.body.data.reviews as Array<{ id: string; rating: number }>).find(
      (row) => row.id === reviewId,
    );
    expect(published).toBeTruthy();
    expect(published!.rating).toBe(5);
    expect(afterPublish.body.data.rating).toBeGreaterThan(0);
    expect(afterPublish.body.data.reviewCount).toBeGreaterThan(0);
  }, 90_000);
});
