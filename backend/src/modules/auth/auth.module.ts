import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CrmModule } from '@/modules/crm/crm.module';
import { MailModule } from '@/modules/mail/mail.module';
import { AuthSessionCacheService } from './auth-session-cache.service';
import { AuthUserCacheService } from './auth-user-cache.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
@Module({
  imports: [PassportModule, JwtModule.register({}), MailModule, CrmModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AuthUserCacheService, AuthSessionCacheService],
  exports: [AuthService, AuthUserCacheService, AuthSessionCacheService],
})
export class AuthModule {}
