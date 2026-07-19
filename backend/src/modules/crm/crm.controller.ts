import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
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
import { Roles } from '@/common/decorators/roles.decorator';
import {
  CustomerActivityResponseDto,
  CustomerOrderHistoryDto,
  CustomerResponseDto,
  SegmentSummaryResponseDto,
} from './dto/customer-response.dto';
import {
  ActivityCursorQueryDto,
  CustomerCursorQueryDto,
  ListCustomersQueryDto,
} from './dto/list-customers.query.dto';
import { CrmService } from './crm.service';

@ApiTags('Admin Customers')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Admin role required' })
@Roles(Role.ADMIN)
@Controller('admin/customers')
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get()
  @ApiOperation({ summary: 'List CRM customers with metrics, segment filters, and sorting' })
  @ApiOkResponse({ type: [CustomerResponseDto] })
  list(@Query() query: ListCustomersQueryDto) {
    return this.crm.listCustomers(query);
  }

  @Get('segments/summary')
  @ApiOperation({ summary: 'Get customer counts for every CRM segment' })
  @ApiOkResponse({ type: [SegmentSummaryResponseDto] })
  summary() {
    return this.crm.segmentSummary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer profile with CRM metrics and segment' })
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.crm.getCustomer(id);
  }

  @Get(':id/orders')
  @ApiOperation({ summary: 'List projected purchase history for a customer' })
  @ApiOkResponse({ type: [CustomerOrderHistoryDto] })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  orders(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CustomerCursorQueryDto,
  ) {
    return this.crm.listOrders(id, query);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'List the cursor-paginated customer activity timeline' })
  @ApiOkResponse({ type: [CustomerActivityResponseDto] })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  activity(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ActivityCursorQueryDto,
  ) {
    return this.crm.listActivity(id, query);
  }
}
