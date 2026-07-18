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
import { AdminReturnActionDto } from './dto/admin-return-action.dto';
import { ListReturnsQueryDto } from './dto/list-returns.query.dto';
import { ReturnDetailResponseDto } from './dto/return-response.dto';
import { ReturnsService } from './returns.service';

@ApiTags('Admin Returns')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Admin role required' })
@Roles(Role.ADMIN)
@Controller('admin/returns')
export class AdminReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Get()
  @ApiOperation({ summary: 'List return requests' })
  @ApiOkResponse({ type: [ReturnDetailResponseDto] })
  list(@Query() query: ListReturnsQueryDto) {
    return this.returns.listAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a return request by id' })
  @ApiOkResponse({ type: ReturnDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Return request not found' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.returns.getAdmin(id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve a pending return request' })
  @ApiOkResponse({ type: ReturnDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid status transition' })
  @ApiNotFoundResponse({ description: 'Return request not found' })
  approve(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminReturnActionDto,
  ) {
    return this.returns.approve(actor, id, dto);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject a pending return request' })
  @ApiOkResponse({ type: ReturnDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid status transition' })
  @ApiNotFoundResponse({ description: 'Return request not found' })
  reject(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminReturnActionDto,
  ) {
    return this.returns.reject(actor, id, dto);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Complete an approved return',
    description: 'Restocks inventory and marks the order returned for refund requests.',
  })
  @ApiOkResponse({ type: ReturnDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Return is not approved' })
  @ApiNotFoundResponse({ description: 'Return request not found' })
  complete(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminReturnActionDto,
  ) {
    return this.returns.complete(actor, id, dto);
  }
}
