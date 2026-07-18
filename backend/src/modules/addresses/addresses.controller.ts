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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
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
import { AddressResponseDto } from './dto/address-response.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressesService } from './addresses.service';

@ApiTags('Addresses')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Insufficient role' })
@Roles(Role.CUSTOMER, Role.ADMIN)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List saved addresses for the signed-in user' })
  @ApiOkResponse({ type: [AddressResponseDto] })
  list(@CurrentUser() actor: JwtPayload) {
    return this.addresses.list(actor.sub);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a saved address',
    description:
      'Country is always stored as Bangladesh. The first address of a type, or any address marked default, becomes the default for that type.',
  })
  @ApiCreatedResponse({ type: AddressResponseDto })
  create(@CurrentUser() actor: JwtPayload, @Body() dto: CreateAddressDto) {
    return this.addresses.create(actor.sub, dto);
  }

  @Post(':id/default')
  @ApiOperation({ summary: 'Set an address as the default for its type' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  setDefault(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.addresses.setDefault(actor.sub, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a saved address by id' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  getById(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.addresses.getById(actor.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a saved address' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  update(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addresses.update(actor.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Soft-delete a saved address',
    description: 'If the deleted address was default, the most recent sibling is promoted.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Address not found' })
  softDelete(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.addresses.softDelete(actor.sub, id);
  }
}
