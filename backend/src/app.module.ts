import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { envValidationSchema } from '@/config/env.validation';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TransformResponseInterceptor } from '@/common/interceptors/transform-response.interceptor';
import { RedisThrottlerStorage } from '@/common/throttler/redis-throttler.storage';
import { PrismaModule } from '@/prisma/prisma.module';
import { PlatformModule } from '@/modules/platform/platform.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';
import { CatalogModule } from '@/modules/catalog/catalog.module';
import { AddressesModule } from '@/modules/addresses/addresses.module';
import { PromotionsModule } from '@/modules/promotions/promotions.module';
import { CartModule } from '@/modules/cart/cart.module';
import { WishlistModule } from '@/modules/wishlist/wishlist.module';
import { OrdersModule } from '@/modules/orders/orders.module';
import { ReturnsModule } from '@/modules/returns/returns.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { PreferencesModule } from '@/modules/preferences/preferences.module';
import { ContactModule } from '@/modules/contact/contact.module';
import { NewsletterModule } from '@/modules/newsletter/newsletter.module';
import { AdminCatalogModule } from '@/modules/admin-catalog/admin-catalog.module';
import { HealthModule } from '@/modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validationSchema: envValidationSchema }),
    LoggerModule.forRoot({
      pinoHttp: {
        redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
        storage: new RedisThrottlerStorage(config),
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow<string>('REDIS_URL') },
      }),
    }),
    PrismaModule,
    PlatformModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    AddressesModule,
    PromotionsModule,
    CartModule,
    WishlistModule,
    OrdersModule,
    ReturnsModule,
    NotificationsModule,
    PreferencesModule,
    ContactModule,
    NewsletterModule,
    AdminCatalogModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
  ],
})
export class AppModule {}
