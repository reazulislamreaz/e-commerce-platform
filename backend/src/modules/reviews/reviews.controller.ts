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
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@/generated/prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListReviewsQueryDto } from './dto/list-reviews.query.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Insufficient role' })
@Roles(Role.CUSTOMER, Role.ADMIN)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Create a product review',
    description:
      'Requires a delivered purchase of the product. Reviews start as pending until an admin publishes them.',
  })
  @ApiCreatedResponse({ type: ReviewResponseDto })
  @ApiBadRequestResponse({ description: 'Not eligible for review' })
  @ApiConflictResponse({ description: 'Review already exists for this product' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  create(@CurrentUser() actor: JwtPayload, @Body() dto: CreateReviewDto) {
    return this.reviews.create(actor.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List reviews for the signed-in customer' })
  @ApiOkResponse({ type: [ReviewResponseDto] })
  list(@CurrentUser() actor: JwtPayload, @Query() query: ListReviewsQueryDto) {
    return this.reviews.listMine(actor.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an owned review' })
  @ApiOkResponse({ type: ReviewResponseDto })
  @ApiNotFoundResponse({ description: 'Review not found' })
  getById(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviews.getMine(actor.sub, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an owned review',
    description: 'Published reviews return to pending after an edit.',
  })
  @ApiOkResponse({ type: ReviewResponseDto })
  @ApiNotFoundResponse({ description: 'Review not found' })
  update(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviews.update(actor.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete an owned review' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Review not found' })
  async remove(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    await this.reviews.remove(actor.sub, id);
  }
}
