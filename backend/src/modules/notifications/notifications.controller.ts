import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
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
import { ListNotificationsQueryDto } from './dto/list-notifications.query.dto';
import {
  NotificationResponseDto,
  ReadAllResponseDto,
  UnreadCountResponseDto,
} from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Insufficient role' })
@Roles(Role.CUSTOMER, Role.ADMIN)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List in-app notifications for the signed-in user' })
  @ApiOkResponse({ type: [NotificationResponseDto] })
  list(@CurrentUser() actor: JwtPayload, @Query() query: ListNotificationsQueryDto) {
    return this.notifications.list(actor.sub, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Count unread notifications' })
  @ApiOkResponse({ type: UnreadCountResponseDto })
  unreadCount(@CurrentUser() actor: JwtPayload) {
    return this.notifications.unreadCount(actor.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  markRead(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.markRead(actor.sub, id);
  }

  @Post('read-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiOkResponse({ type: ReadAllResponseDto })
  markAllRead(@CurrentUser() actor: JwtPayload) {
    return this.notifications.markAllRead(actor.sub);
  }
}
