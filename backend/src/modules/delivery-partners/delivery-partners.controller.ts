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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@/generated/prisma/client';
import { Roles } from '@/common/decorators/roles.decorator';
import {
  CreateDeliveryPartnerDto,
  DeliveryPartnerResponseDto,
  ListDeliveryPartnersQueryDto,
  UpdateDeliveryPartnerDto,
} from './dto/delivery-partner.dto';
import { DeliveryPartnersService } from './delivery-partners.service';

@ApiTags('Admin Delivery Partners')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Admin role required' })
@Roles(Role.ADMIN)
@Controller('admin/delivery-partners')
export class DeliveryPartnersController {
  constructor(private readonly partners: DeliveryPartnersService) {}

  @Get()
  @ApiOperation({ summary: 'List delivery partners' })
  @ApiOkResponse({ type: [DeliveryPartnerResponseDto] })
  list(@Query() query: ListDeliveryPartnersQueryDto) {
    return this.partners.list(query);
  }

  @Get('active')
  @ApiOperation({ summary: 'List active delivery partners for assignment' })
  @ApiOkResponse({ type: [DeliveryPartnerResponseDto] })
  listActive() {
    return this.partners.listActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a delivery partner' })
  @ApiOkResponse({ type: DeliveryPartnerResponseDto })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a delivery partner' })
  @ApiCreatedResponse({ type: DeliveryPartnerResponseDto })
  create(@Body() dto: CreateDeliveryPartnerDto) {
    return this.partners.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a delivery partner' })
  @ApiOkResponse({ type: DeliveryPartnerResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDeliveryPartnerDto) {
    return this.partners.update(id, dto);
  }

  @Post(':id/activate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Activate a delivery partner' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.setActive(id, true);
  }

  @Post(':id/deactivate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Deactivate a delivery partner' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.setActive(id, false);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Delete a delivery partner',
    description: 'Hard-deletes when unused; otherwise soft-deactivates.',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.remove(id);
  }
}
