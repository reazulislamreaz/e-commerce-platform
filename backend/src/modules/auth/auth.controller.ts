import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt.strategy';
const refreshCookie = 'refresh_token';
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}
  @Public() @Post('register') register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }
  @Public() @HttpCode(200) @Post('login') async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto);
    this.setRefreshCookie(response, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }
  @Public() @HttpCode(200) @Post('refresh') async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = request.cookies?.[refreshCookie] as string | undefined;
    if (!token) throw new UnauthorizedException('Refresh token is required');
    const payload = await this.verifyRefreshToken(token);
    const result = await this.auth.refresh(payload.sub, token);
    this.setRefreshCookie(response, result.refreshToken);
    return { accessToken: result.accessToken };
  }
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @HttpCode(204) @Post('logout') async logout(
    @Req() request: Request & { user: JwtPayload },
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(request.user.sub);
    response.clearCookie(refreshCookie, { path: '/api/v1/auth' });
  }
  private setRefreshCookie(response: Response, token: string): void {
    response.cookie(refreshCookie, token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
  private verifyRefreshToken(token: string): Promise<JwtPayload> {
    return this.jwt.verifyAsync<JwtPayload>(token, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
    });
  }
}
