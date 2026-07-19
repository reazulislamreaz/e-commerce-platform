import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@/generated/prisma/client';
import { Roles } from '@/common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
import { BestsellersQueryDto, SalesQueryDto } from './dto/analytics-query.dto';

@ApiTags('Admin Analytics')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Admin role required' })
@Roles(Role.ADMIN)
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get store revenue and order overview' })
  @ApiOkResponse({ description: 'Current totals and previous-period deltas' })
  overview() {
    return this.analytics.overview();
  }

  @Get('sales')
  @ApiOperation({ summary: 'Get zero-filled sales time series' })
  @ApiOkResponse({ description: 'Revenue and order count grouped by day or month' })
  sales(@Query() query: SalesQueryDto) {
    return this.analytics.sales(query);
  }

  @Get('products/bestsellers')
  @ApiOperation({ summary: 'Get bestselling products' })
  @ApiOkResponse({ description: 'Products ranked by recognized units and revenue' })
  bestsellers(@Query() query: BestsellersQueryDto) {
    return this.analytics.bestsellers(query.limit);
  }

  @Get('customers/summary')
  @ApiOperation({ summary: 'Get customer analytics summary' })
  @ApiOkResponse({ description: 'New, high-value, and top lifetime-value customers' })
  customers() {
    return this.analytics.customerSummary();
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Get inventory risk summary' })
  @ApiOkResponse({ description: 'Low/out-of-stock counts and lowest-stock SKUs' })
  inventory() {
    return this.analytics.inventory();
  }
}
