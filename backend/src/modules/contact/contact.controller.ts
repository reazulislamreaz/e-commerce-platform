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
  Req,
} from '@nestjs/common';
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
import { Throttle } from '@nestjs/throttler';
import { Role } from '@/generated/prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { OptionalUser } from '@/common/decorators/optional-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import type { Request } from 'express';
import {
  AdminUpdateContactMessageDto,
  ListContactMessagesQueryDto,
} from './dto/admin-contact.dto';
import { ContactMessageResponseDto, ContactSubmitResponseDto } from './dto/contact-response.dto';
import { SubmitContactDto } from './dto/submit-contact.dto';
import { ContactService } from './contact.service';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Submit a contact message',
    description: 'Public endpoint with honeypot protection and rate limiting.',
  })
  @ApiCreatedResponse({ type: ContactSubmitResponseDto })
  submit(
    @OptionalUser() actor: JwtPayload | undefined,
    @Body() dto: SubmitContactDto,
    @Req() request: Request,
  ) {
    return this.contact.submit(dto, actor, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }
}

@ApiTags('Admin Contact')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Admin role required' })
@Roles(Role.ADMIN)
@Controller('admin/contact-messages')
export class AdminContactController {
  constructor(private readonly contact: ContactService) {}

  @Get()
  @ApiOperation({ summary: 'List contact messages' })
  @ApiOkResponse({ type: [ContactMessageResponseDto] })
  list(@Query() query: ListContactMessagesQueryDto) {
    return this.contact.listAdmin(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update contact message status or admin notes' })
  @ApiOkResponse({ type: ContactMessageResponseDto })
  @ApiNotFoundResponse({ description: 'Contact message not found' })
  update(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateContactMessageDto,
  ) {
    return this.contact.updateAdmin(actor, id, dto);
  }
}
