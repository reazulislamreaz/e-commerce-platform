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
import { CreateReturnDto } from './dto/create-return.dto';
import { ListReturnsQueryDto } from './dto/list-returns.query.dto';
import { ReturnDetailResponseDto, ReturnRequestResponseDto } from './dto/return-response.dto';
import { ReturnsService } from './returns.service';

@ApiTags('Returns')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Insufficient role' })
@Roles(Role.CUSTOMER, Role.ADMIN)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Request a return or exchange',
    description:
      'Order must be delivered within the last 7 days. Omit items to request all order lines.',
  })
  @ApiCreatedResponse({ type: ReturnRequestResponseDto })
  @ApiBadRequestResponse({ description: 'Eligibility, sale-item, or duplicate request errors' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  create(@CurrentUser() actor: JwtPayload, @Body() dto: CreateReturnDto) {
    return this.returns.create(actor.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List return requests for the signed-in customer' })
  @ApiOkResponse({ type: [ReturnRequestResponseDto] })
  list(@CurrentUser() actor: JwtPayload, @Query() query: ListReturnsQueryDto) {
    return this.returns.listMine(actor.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an owned return request' })
  @ApiOkResponse({ type: ReturnDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Return request not found' })
  getById(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.returns.getMine(actor.sub, id);
  }
}
