import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { OptionalUser } from '@/common/decorators/optional-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import type { Request } from 'express';
import { ListNewsletterSubscriptionsQueryDto } from './dto/list-newsletter.query.dto';
import {
  NewsletterSubscribeResponseDto,
  NewsletterSubscriptionResponseDto,
  NewsletterUnsubscribeResponseDto,
} from './dto/newsletter-response.dto';
import {
  SubscribeNewsletterDto,
  UnsubscribeNewsletterQueryDto,
} from './dto/subscribe-newsletter.dto';
import { NewsletterService } from './newsletter.service';

@ApiTags('Newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Public()
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Subscribe to the newsletter' })
  @ApiCreatedResponse({ type: NewsletterSubscribeResponseDto })
  subscribe(
    @OptionalUser() actor: JwtPayload | undefined,
    @Body() dto: SubscribeNewsletterDto,
    @Req() request: Request,
  ) {
    return this.newsletter.subscribe(dto, actor, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  @Public()
  @Get('unsubscribe')
  @ApiOperation({
    summary: 'Unsubscribe via emailed token (GET)',
    description: 'Always returns a success message for a safe UX.',
  })
  @ApiOkResponse({ type: NewsletterUnsubscribeResponseDto })
  unsubscribeGet(@Query() query: UnsubscribeNewsletterQueryDto) {
    return this.newsletter.unsubscribe(query.token);
  }

  @Public()
  @Post('unsubscribe')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Unsubscribe via emailed token (POST)',
    description: 'Always returns a success message for a safe UX.',
  })
  @ApiOkResponse({ type: NewsletterUnsubscribeResponseDto })
  unsubscribePost(@Query() query: UnsubscribeNewsletterQueryDto) {
    return this.newsletter.unsubscribe(query.token);
  }
}

@ApiTags('Admin Newsletter')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Admin role required' })
@Roles(Role.ADMIN)
@Controller('admin/newsletter/subscriptions')
export class AdminNewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Get()
  @ApiOperation({ summary: 'List newsletter subscriptions' })
  @ApiOkResponse({ type: [NewsletterSubscriptionResponseDto] })
  list(@Query() query: ListNewsletterSubscriptionsQueryDto) {
    return this.newsletter.listAdmin(query);
  }

  @Post(':id/unsubscribe')
  @HttpCode(200)
  @ApiOperation({ summary: 'Force-unsubscribe a newsletter recipient' })
  @ApiOkResponse({ type: NewsletterSubscriptionResponseDto })
  @ApiNotFoundResponse({ description: 'Subscription not found' })
  unsubscribe(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.newsletter.adminUnsubscribe(actor, id);
  }
}
