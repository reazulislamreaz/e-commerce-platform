import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@/generated/prisma/client';
import { OptionalUser } from '@/common/decorators/optional-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { Request, Response } from 'express';
import { CartService, GUEST_CART_COOKIE, GUEST_CART_TTL_MS } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartResponseDto } from './dto/cart-response.dto';
import { UpdateCartRecoveryEmailDto } from './dto/update-cart-recovery-email.dto';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(
    private readonly cart: CartService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get the active cart',
    description:
      'Returns the signed-in user cart when a Bearer token is present; otherwise the guest cart from the guest_cart cookie.',
  })
  @ApiBearerAuth()
  @ApiCookieAuth(GUEST_CART_COOKIE)
  @ApiOkResponse({ type: CartResponseDto })
  getCart(@OptionalUser() user: JwtPayload | undefined, @Req() request: Request) {
    const guestToken = this.readGuestToken(request);
    return this.cart.getCart(user, guestToken);
  }

  @Public()
  @Post('items')
  @ApiOperation({
    summary: 'Add quantity to a cart line',
    description: 'Upserts a line and sums quantities, capped at available stock (minimum 1).',
  })
  @ApiBearerAuth()
  @ApiCookieAuth(GUEST_CART_COOKIE)
  @ApiOkResponse({ type: CartResponseDto })
  @ApiNotFoundResponse({ description: 'Variant not found' })
  @ApiBadRequestResponse({ description: 'Variant is out of stock' })
  async addItem(
    @OptionalUser() user: JwtPayload | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: AddCartItemDto,
  ) {
    const guestToken = this.readGuestToken(request);
    const result = await this.cart.addItem(user, guestToken, dto);
    this.applyGuestCookie(response, result.guestCookie);
    return result.cart;
  }

  @Public()
  @Patch('items/:variantId')
  @ApiOperation({
    summary: 'Set cart line quantity',
    description: 'Sets an absolute quantity; 0 removes the line.',
  })
  @ApiBearerAuth()
  @ApiCookieAuth(GUEST_CART_COOKIE)
  @ApiOkResponse({ type: CartResponseDto })
  @ApiNotFoundResponse({ description: 'Variant not found' })
  @ApiBadRequestResponse({ description: 'Variant is out of stock' })
  async updateItem(
    @OptionalUser() user: JwtPayload | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const guestToken = this.readGuestToken(request);
    const result = await this.cart.updateItem(user, guestToken, variantId, dto.quantity);
    this.applyGuestCookie(response, result.guestCookie);
    return result.cart;
  }

  @Public()
  @Delete('items/:variantId')
  @ApiOperation({ summary: 'Remove a cart line' })
  @ApiBearerAuth()
  @ApiCookieAuth(GUEST_CART_COOKIE)
  @ApiOkResponse({ type: CartResponseDto })
  async removeItem(
    @OptionalUser() user: JwtPayload | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ) {
    const guestToken = this.readGuestToken(request);
    const result = await this.cart.removeItem(user, guestToken, variantId);
    this.applyGuestCookie(response, result.guestCookie);
    return result.cart;
  }

  @Public()
  @Delete()
  @ApiOperation({ summary: 'Clear all cart lines' })
  @ApiBearerAuth()
  @ApiCookieAuth(GUEST_CART_COOKIE)
  @ApiOkResponse({ type: CartResponseDto })
  async clearCart(
    @OptionalUser() user: JwtPayload | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const guestToken = this.readGuestToken(request);
    const result = await this.cart.clearCart(user, guestToken);
    this.applyGuestCookie(response, result.guestCookie);
    return result.cart;
  }

  @Public()
  @Patch('recovery-email')
  @ApiOperation({
    summary: 'Save an email for guest cart recovery',
    description: 'Stores a validated email on the active cart without exposing it in cart responses.',
  })
  @ApiBearerAuth()
  @ApiCookieAuth(GUEST_CART_COOKIE)
  @ApiOkResponse({ type: CartResponseDto })
  async setRecoveryEmail(
    @OptionalUser() user: JwtPayload | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: UpdateCartRecoveryEmailDto,
  ) {
    const result = await this.cart.setRecoveryEmail(
      user,
      this.readGuestToken(request),
      dto.email,
    );
    this.applyGuestCookie(response, result.guestCookie);
    return result.cart;
  }

  @Roles(Role.CUSTOMER, Role.ADMIN)
  @Post('merge')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Merge guest cart into the signed-in user cart',
    description:
      'Sums line quantities from the guest_cart cookie into the user cart, caps at stock, deletes the guest cart, and clears the cookie.',
  })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Customer or admin role required' })
  async mergeGuestCart(
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const guestToken = this.readGuestToken(request);
    const cart = await this.cart.mergeGuestIntoUser(user.sub, guestToken);
    this.clearGuestCookie(response);
    return cart;
  }

  private readGuestToken(request: Request): string | undefined {
    const token = request.cookies?.[GUEST_CART_COOKIE];
    return typeof token === 'string' && token.length > 0 ? token : undefined;
  }

  private applyGuestCookie(
    response: Response,
    guestCookie: { token: string; isNew: boolean } | undefined,
  ): void {
    if (guestCookie?.isNew) this.setGuestCartCookie(response, guestCookie.token);
  }

  private setGuestCartCookie(response: Response, token: string): void {
    response.cookie(GUEST_CART_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: GUEST_CART_TTL_MS,
    });
  }

  private clearGuestCookie(response: Response): void {
    response.clearCookie(GUEST_CART_COOKIE, { path: '/' });
  }
}
