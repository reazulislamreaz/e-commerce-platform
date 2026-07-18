import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import {
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
import { MergeWishlistDto } from './dto/merge-wishlist.dto';
import { WishlistResponseDto } from './dto/wishlist-response.dto';
import { WishlistService } from './wishlist.service';

@ApiTags('Wishlist')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Customer or admin role required' })
@Roles(Role.CUSTOMER, Role.ADMIN)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get the signed-in user wishlist product IDs' })
  @ApiOkResponse({ type: WishlistResponseDto })
  getWishlist(@CurrentUser() user: JwtPayload) {
    return this.wishlist.getWishlist(user.sub);
  }

  @Post('merge')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Union client-side product IDs into the server wishlist',
    description: 'Adds any active published products not already saved on the wishlist.',
  })
  @ApiOkResponse({ type: WishlistResponseDto })
  mergeWishlist(@CurrentUser() user: JwtPayload, @Body() dto: MergeWishlistDto) {
    return this.wishlist.mergeProductIds(user.sub, dto.productIds);
  }

  @Put(':productId')
  @ApiOperation({ summary: 'Add a product to the wishlist (idempotent)' })
  @ApiOkResponse({ type: WishlistResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found' })
  addProduct(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.wishlist.addProduct(user.sub, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove a product from the wishlist' })
  @ApiOkResponse({ type: WishlistResponseDto })
  removeProduct(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.wishlist.removeProduct(user.sub, productId);
  }
}
