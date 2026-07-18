import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import {
  AuthService,
  REFRESH_TOKEN_TTL_MS,
  REMEMBER_ME_REFRESH_TOKEN_TTL_MS,
} from './auth.service';
import { AccessTokenResponseDto, AuthUserDto, LoginResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailQueryDto } from './dto/verify-email.query.dto';
import type { JwtPayload } from './jwt.strategy';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({
    summary: 'Create a customer account',
    description:
      'Creates the account in PENDING_VERIFICATION status and sends an email verification link. Login is possible only after the email is verified.',
  })
  @ApiCreatedResponse({ type: AuthUserDto })
  @ApiConflictResponse({ description: 'Email or phone number is already registered' })
  async register(@Body() dto: RegisterDto) {
    const user = await this.auth.register(dto);
    return {
      data: user,
      message: 'Account created. Check your email for the verification link.',
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify an email address and activate the account' })
  @ApiOkResponse({ description: 'Email verified; the account is now active' })
  @ApiBadRequestResponse({ description: 'Invalid, expired, or already-used verification link' })
  async verifyEmail(@Query() query: VerifyEmailQueryDto) {
    await this.auth.verifyEmail(query.token);
    return { data: null, message: 'Email verified. You can now sign in.' };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(200)
  @Post('resend-verification')
  @ApiOperation({
    summary: 'Re-send the verification email',
    description: 'Always responds 200 so account existence is never leaked.',
  })
  @ApiOkResponse({ description: 'If the account exists and is unverified, an email was sent' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.auth.resendVerification(dto.email);
    return {
      data: null,
      message: 'If an unverified account exists for this email, a new link has been sent.',
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  @ApiOperation({ summary: 'Authenticate and start a session' })
  @ApiOkResponse({ type: LoginResponseDto, description: 'Sets an HTTP-only refresh cookie' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or inactive account' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
    this.setRefreshCookie(response, result.refreshToken, result.rememberMe);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(200)
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request a password reset link',
    description:
      'Emails a single-use reset link valid for 30 minutes. Always responds 200 so account existence is never leaked.',
  })
  @ApiOkResponse({ description: 'If an active account exists for this email, a link was sent' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return {
      data: null,
      message: 'If an account exists for this email, a reset link has been sent.',
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset the password with an emailed token',
    description: 'Consumes the reset token, sets the new password, and revokes every session.',
  })
  @ApiOkResponse({ description: 'Password updated; all sessions revoked' })
  @ApiBadRequestResponse({ description: 'Invalid, expired, or already-used reset link' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return { data: null, message: 'Password updated. You can now sign in.' };
  }

  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('change-password')
  @ApiOperation({
    summary: 'Change the password of the signed-in user',
    description:
      'Requires the current password. Every other session is revoked; the current session stays signed in.',
  })
  @ApiOkResponse({ description: 'Password updated; other sessions revoked' })
  @ApiBadRequestResponse({ description: 'Current password is incorrect or new password reused' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(user.sub, user.sid, dto.currentPassword, dto.password);
    return { data: null, message: 'Password updated.' };
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @Post('refresh')
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  @ApiOkResponse({ type: AccessTokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing, expired, or reused refresh token' })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = request.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) throw new UnauthorizedException('Refresh token is required');
    const result = await this.auth.refresh(token);
    this.setRefreshCookie(response, result.refreshToken, result.rememberMe);
    return { accessToken: result.accessToken };
  }

  @ApiBearerAuth()
  @HttpCode(204)
  @Post('logout')
  @ApiOperation({ summary: 'Revoke the current session and its refresh tokens' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async logout(
    @Req() request: Request & { user: JwtPayload },
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(request.user.sid);
    response.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  }

  private setRefreshCookie(response: Response, token: string, rememberMe: boolean): void {
    response.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: rememberMe ? REMEMBER_ME_REFRESH_TOKEN_TTL_MS : REFRESH_TOKEN_TTL_MS,
    });
  }
}
