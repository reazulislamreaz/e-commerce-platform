import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { AdminListOrdersQueryDto } from './dto/admin-list-orders.query.dto';
import { AdminSetTrackingDto } from './dto/admin-set-tracking.dto';
import { AdminUpdateOrderStatusDto } from './dto/admin-update-order-status.dto';
import { BulkOrdersDto, BulkOrdersResultDto, UpdateOrderNotesDto } from './dto/bulk-orders.dto';
import { OrderResponseDto, OrdersSummaryDto } from './dto/order-response.dto';
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
  @ApiOperation({ summary: 'List orders with admin filters (offset pagination)' })
  @ApiOkResponse({ type: [OrderResponseDto] })
  list(@Query() query: AdminListOrdersQueryDto) {
    return this.orders.listAdminOffset(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Order management KPI summary' })
  @ApiOkResponse({ type: OrdersSummaryDto })
  summary() {
    return this.orders.getSummary();
  }

  @Post('bulk')
  @HttpCode(200)
  @ApiOperation({ summary: 'Apply a bulk action to orders' })
  @ApiOkResponse({ type: BulkOrdersResultDto })
  bulk(@CurrentUser() actor: JwtPayload, @Body() dto: BulkOrdersDto) {
    return this.orders.bulk(actor, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by id' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.getAdmin(id);
  }

  @Patch(':id/notes')
  @ApiOperation({ summary: 'Update internal order notes' })
  @ApiOkResponse({ type: OrderResponseDto })
  updateNotes(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderNotesDto,
  ) {
    return this.orders.updateNotes(actor, id, dto);
  }

  @Post(':id/status')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Advance order fulfillment status',
    description:
      'PENDING→CONFIRMED|CANCELLED, CONFIRMED→PROCESSING|CANCELLED, PROCESSING→PACKED|CANCELLED, PACKED→SHIPPED|CANCELLED, SHIPPED→DELIVERED. Shipping requires tracking on the order or in the same request. Delivery partner assignment is optional on ship.',
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
