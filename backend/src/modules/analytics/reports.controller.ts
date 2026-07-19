import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createReadStream } from 'node:fs';
import { Role } from '@/generated/prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import { CreateReportExportDto } from './dto/report-export.dto';
import { ReportsService } from './reports.service';

@ApiTags('Admin Reports')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Admin role required' })
@Roles(Role.ADMIN)
@Controller('admin/reports/exports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Queue a CSV or XLSX report export' })
  @ApiOkResponse({ description: 'Export job created' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReportExportDto) {
    return this.reports.create(user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an export job status' })
  @ApiOkResponse({ description: 'Export job status' })
  @ApiNotFoundResponse({ description: 'Export job not found' })
  get(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.reports.get(id, user.sub);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a ready report export' })
  @ApiOkResponse({ description: 'CSV or XLSX file stream' })
  @ApiConflictResponse({ description: 'Export is not ready' })
  @ApiGoneResponse({ description: 'Export has expired' })
  @ApiNotFoundResponse({ description: 'Export or file not found' })
  async download(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const file = await this.reports.download(id, user.sub);
    const type =
      file.format === 'CSV'
        ? 'text/csv; charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return new StreamableFile(createReadStream(file.filePath), {
      type,
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }
}
