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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@/generated/prisma/client';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import {
  CreateBannerDto,
  ListAdminBannersQueryDto,
  ListPublicBannersQueryDto,
  UpdateBannerDto,
} from './dto/banner.dto';
import { MarketingService } from './marketing.service';

@ApiTags('Marketing')
@Controller()
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}

  @Public()
  @Get('banners')
  @ApiOperation({ summary: 'List active banners for a storefront placement' })
  @ApiOkResponse({ description: 'Active banners ordered by position' })
  listPublic(@Query() query: ListPublicBannersQueryDto) {
    return this.marketing.listPublic(query.placement);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Get('admin/banners')
  @ApiOperation({ summary: 'List marketing banners (offset pagination)' })
  @ApiOkResponse({ description: 'Non-deleted banners' })
  listAdmin(@Query() query: ListAdminBannersQueryDto) {
    return this.marketing.listAdmin(query);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Get('admin/banners/:id')
  @ApiOperation({ summary: 'Get a marketing banner' })
  getAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.marketing.getAdmin(id);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Post('admin/banners')
  @ApiOperation({ summary: 'Create a marketing banner' })
  @ApiCreatedResponse({ description: 'Banner created' })
  create(@Body() dto: CreateBannerDto) {
    return this.marketing.create(dto);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Patch('admin/banners/:id')
  @ApiOperation({ summary: 'Update a marketing banner' })
  @ApiOkResponse({ description: 'Banner updated' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBannerDto) {
    return this.marketing.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Delete('admin/banners/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Archive a marketing banner' })
  @ApiNoContentResponse()
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.marketing.delete(id);
  }
}
