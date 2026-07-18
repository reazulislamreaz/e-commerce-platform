import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
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
import { AdminCatalogService } from './admin-catalog.service';
import {
  InventoryAdjustmentDto,
  InventoryBalanceResponseDto,
  InventoryLocationResponseDto,
  InventoryMovementResponseDto,
  ListInventoryBalancesQueryDto,
  ListInventoryMovementsQueryDto,
} from './dto/inventory.dto';

@ApiTags('Admin Inventory')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Admin role required' })
@Roles(Role.ADMIN)
@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(private readonly adminCatalog: AdminCatalogService) {}

  @Get('balances')
  @ApiOperation({ summary: 'List inventory balances with optional filters' })
  @ApiOkResponse({ type: [InventoryBalanceResponseDto] })
  listBalances(@Query() query: ListInventoryBalancesQueryDto) {
    return this.adminCatalog.listInventoryBalances(query);
  }

  @Get('movements')
  @ApiOperation({ summary: 'List inventory movements' })
  @ApiOkResponse({ type: [InventoryMovementResponseDto] })
  listMovements(@Query() query: ListInventoryMovementsQueryDto) {
    return this.adminCatalog.listInventoryMovements(query);
  }

  @Post('adjustments')
  @HttpCode(200)
  @ApiOperation({ summary: 'Adjust on-hand stock for a variant at a location' })
  @ApiOkResponse({ description: 'Adjustment applied or replayed idempotently' })
  @ApiBadRequestResponse({ description: 'Invalid adjustment or version conflict' })
  @ApiNotFoundResponse({ description: 'Variant or location not found' })
  adjust(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: InventoryAdjustmentDto,
  ) {
    return this.adminCatalog.adjustInventory(actor, dto);
  }

  @Get('locations')
  @ApiOperation({ summary: 'List inventory locations' })
  @ApiOkResponse({ type: [InventoryLocationResponseDto] })
  listLocations() {
    return this.adminCatalog.listInventoryLocations();
  }
}
