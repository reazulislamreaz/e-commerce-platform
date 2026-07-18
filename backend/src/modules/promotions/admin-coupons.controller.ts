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
  ApiConflictResponse,
  ApiCreatedResponse,
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
import {
  AdminCouponRedemptionResponseDto,
  AdminCouponResponseDto,
  CreateAdminCouponDto,
  ListAdminCouponRedemptionsQueryDto,
  UpdateAdminCouponDto,
} from './dto/admin-coupon.dto';
import { PromotionsService } from './promotions.service';

@ApiTags('Admin Coupons')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Admin role required' })
@Roles(Role.ADMIN)
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get()
  @ApiOperation({ summary: 'List coupons for admin management' })
  @ApiOkResponse({ type: [AdminCouponResponseDto] })
  list() {
    return this.promotions.listAdminCoupons();
  }

  @Post()
  @ApiOperation({ summary: 'Create a coupon and linked promotion' })
  @ApiCreatedResponse({ type: AdminCouponResponseDto })
  @ApiConflictResponse({ description: 'Coupon code already exists' })
  @ApiBadRequestResponse({ description: 'Invalid reward configuration' })
  create(@CurrentUser() actor: JwtPayload, @Body() dto: CreateAdminCouponDto) {
    return this.promotions.createAdminCoupon(actor, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a coupon by id' })
  @ApiOkResponse({ type: AdminCouponResponseDto })
  @ApiNotFoundResponse({ description: 'Coupon not found' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotions.getAdminCoupon(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update coupon merchandising and promotion rules' })
  @ApiOkResponse({ type: AdminCouponResponseDto })
  @ApiNotFoundResponse({ description: 'Coupon not found' })
  update(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminCouponDto,
  ) {
    return this.promotions.updateAdminCoupon(actor, id, dto);
  }

  @Post(':id/deactivate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Disable a coupon promotion' })
  @ApiOkResponse({ type: AdminCouponResponseDto })
  @ApiNotFoundResponse({ description: 'Coupon not found' })
  deactivate(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.promotions.deactivateAdminCoupon(actor, id);
  }

  @Get(':id/redemptions')
  @ApiOperation({ summary: 'List redemptions for a coupon' })
  @ApiOkResponse({ type: [AdminCouponRedemptionResponseDto] })
  @ApiNotFoundResponse({ description: 'Coupon not found' })
  listRedemptions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListAdminCouponRedemptionsQueryDto,
  ) {
    return this.promotions.listAdminCouponRedemptions(id, query);
  }
}
