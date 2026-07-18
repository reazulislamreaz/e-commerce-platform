import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@/generated/prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { AdminCancelOrderDto } from './dto/admin-cancel-order.dto';
import { AdminSetTrackingDto } from './dto/admin-set-tracking.dto';
import { AdminUpdateOrderStatusDto } from './dto/admin-update-order-status.dto';
import { ListOrdersQueryDto } from './dto/list-orders.query.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

@ApiTags('Admin Orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Admin role required' })
@Roles(Role.ADMIN)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders with admin filters' })
  @ApiOkResponse({ type: [OrderResponseDto] })
  list(@Query() query: ListOrdersQueryDto) {
    return this.orders.listAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by id' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.getAdmin(id);
  }

  @Post(':id/status')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Advance order fulfillment status',
    description:
      'CONFIRMED→PROCESSING|CANCELLED, PROCESSING→SHIPPED|CANCELLED, SHIPPED→DELIVERED. Shipping requires tracking on the order or in the same request.',
  })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid transition or missing tracking' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  updateStatus(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateOrderStatusDto,
  ) {
    return this.orders.updateStatus(actor, id, dto);
  }

  @Post(':id/tracking')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create or update shipment tracking for an order' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  setTracking(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminSetTrackingDto,
  ) {
    return this.orders.setTracking(actor, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Cancel an order before shipment',
    description: 'Releases inventory and marks COD payment cancelled when still pre-ship.',
  })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid transition' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  cancel(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminCancelOrderDto,
  ) {
    return this.orders.cancel(actor, id, dto);
  }
}
