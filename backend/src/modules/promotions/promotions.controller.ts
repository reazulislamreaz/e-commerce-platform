import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@/generated/prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { CouponResponseDto } from './dto/coupon-response.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { ValidateCouponResponseDto } from './dto/validate-coupon-response.dto';
import { PromotionsService } from './promotions.service';

@ApiTags('Coupons')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Insufficient role' })
@Roles(Role.CUSTOMER, Role.ADMIN)
@Controller('coupons')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Post('validate')
  @ApiOperation({
    summary: 'Validate a coupon against the current cart subtotal',
    description:
      'Requires a signed-in customer or admin. Does not redeem the coupon; checkout creates the redemption.',
  })
  @ApiOkResponse({ type: ValidateCouponResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid, expired, ineligible, or already-used coupon',
  })
  validate(@CurrentUser() actor: JwtPayload, @Body() dto: ValidateCouponDto) {
    return this.promotions.validate(dto, actor.sub);
  }

  @Get('mine')
  @ApiOperation({
    summary: 'List active storefront coupons for the signed-in user',
    description:
      'Returns currently active promotions with a used flag when the user has redeemed the coupon.',
  })
  @ApiOkResponse({ type: [CouponResponseDto] })
  listMine(@CurrentUser() actor: JwtPayload) {
    return this.promotions.listMine(actor.sub);
  }
}
