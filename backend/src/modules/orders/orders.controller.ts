import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { GUEST_CART_COOKIE } from '@/modules/cart/cart.service';
import { Request } from 'express';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders.query.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { TrackOrderQueryDto } from './dto/track-order.query.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Public()
  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Place a COD order',
    description:
      'Creates a confirmed order from explicit items or the signed-in/guest server cart. Requires an Idempotency-Key header.',
  })
  @ApiBearerAuth()
  @ApiCookieAuth(GUEST_CART_COOKIE)
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({ description: 'Validation, empty cart, stock, or coupon errors' })
  @ApiConflictResponse({ description: 'Idempotency-Key reused with a different body' })
  async create(
    @OptionalUser() user: JwtPayload | undefined,
    @Req() request: Request,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateOrderDto,
  ) {
    const key = idempotencyKey?.trim();
    if (!key) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const guestToken = this.readGuestToken(request);
    const result = await this.orders.createOrder(dto, key, user, guestToken);
    if (result.kind === 'replay') return result.body;
    return result.order;
  }

  @Get('track')
  @Public()
  @ApiOperation({
    summary: 'Track an order by number and email',
    description: 'Public lookup with case-insensitive email matching. Returns 404 when not found.',
  })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  track(@Query() query: TrackOrderQueryDto) {
    return this.orders.track(query);
  }

  @Get('track/invoice')
  @Public()
  @ApiOperation({
    summary: 'Download a guest invoice PDF by order number and email',
    description:
      'Public invoice download using the same number + email security model as order tracking.',
  })
  @ApiOkResponse({ description: 'PDF invoice stream' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async trackInvoice(@Query() query: TrackOrderQueryDto): Promise<StreamableFile> {
    const file = await this.orders.getTrackedInvoice(query);
    return this.toPdf(file);
  }

  @Get()
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List orders for the signed-in customer' })
  @ApiOkResponse({ type: [OrderResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Customer or admin role required' })
  listMine(@CurrentUser() actor: JwtPayload, @Query() query: ListOrdersQueryDto) {
    return this.orders.listMine(actor.sub, query);
  }

  @Get(':id/invoice')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download the invoice PDF for an owned order' })
  @ApiOkResponse({ description: 'PDF invoice stream' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Customer or admin role required' })
  async invoice(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const file = await this.orders.getMineInvoice(actor.sub, id);
    return this.toPdf(file);
  }

  @Get(':id')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an owned order by id' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'Customer or admin role required' })
  getMine(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.getMine(actor.sub, id);
  }

  private toPdf(file: { buffer: Buffer; fileName: string }): StreamableFile {
    return new StreamableFile(file.buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }

  private readGuestToken(request: Request): string | undefined {
    const token = request.cookies?.[GUEST_CART_COOKIE];
    return typeof token === 'string' && token.length > 0 ? token : undefined;
  }
}
