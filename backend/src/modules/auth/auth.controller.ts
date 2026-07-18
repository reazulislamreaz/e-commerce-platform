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
import { Public } from '@/common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { AccessTokenResponseDto, AuthUserDto, LoginResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailQueryDto } from './dto/verify-email.query.dto';
import type { JwtPayload } from './jwt.strategy';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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
    this.setRefreshCookie(response, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
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
    this.setRefreshCookie(response, result.refreshToken);
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

  private setRefreshCookie(response: Response, token: string): void {
    response.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });
  }
}
