import 'dotenv/config';
import { ValidationPipe, VersioningType, RequestMethod } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';

describe('COD order smoke (HTTP)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

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
    await app?.close();
  });

  it('places a guest COD order and tracks it with idempotent replay', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);

    const product = await prisma.product.findFirst({
      where: { slug: 'urban-horizon-distressed-stripe-shirt', deletedAt: null },
      include: {
        variants: {
          where: { isActive: true, deletedAt: null },
          include: { inventoryBalances: true },
          take: 20,
        },
      },
    });
    expect(product).toBeTruthy();

    const variant = product!.variants.find((row) =>
      row.inventoryBalances.some((balance) => balance.onHand - balance.reserved > 0),
    );
    expect(variant).toBeTruthy();

    const email = `cod-smoke+${Date.now()}@example.com`;
    const idempotencyKey = `cod-smoke-${Date.now()}`;
    const body = {
      fullName: 'Smoke Tester',
      phone: '+8801712345678',
      email,
      line1: 'House 12, Road 4',
      city: 'Dhaka',
      district: 'Dhaka',
      postalCode: '1207',
      paymentMethod: 'cod',
      items: [{ variantId: variant!.id, quantity: 1 }],
    };

    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Idempotency-Key', idempotencyKey)
      .send(body)
      .expect(201);

    expect(created.body.success).toBe(true);
    expect(created.body.data.paymentMethod).toBe('cod');
    expect(created.body.data.number).toMatch(/^EA/i);
    expect(created.body.data.status).toBe('confirmed');

    const replay = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Idempotency-Key', idempotencyKey)
      .send(body)
      .expect(201);

    expect(replay.body.data.id).toBe(created.body.data.id);
    expect(replay.body.data.number).toBe(created.body.data.number);

    const tracked = await request(app.getHttpServer())
      .get('/api/v1/orders/track')
      .query({ number: created.body.data.number, email })
      .expect(200);

    expect(tracked.body.data.id).toBe(created.body.data.id);
    expect(tracked.body.data.email).toBe(email);
  }, 60_000);
});
