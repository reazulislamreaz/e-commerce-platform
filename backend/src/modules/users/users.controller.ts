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
  ApiConflictResponse,
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
import { CreateAdminDto } from './dto/create-admin.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Insufficient role or hierarchy violation' })
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles(Role.SUPER_ADMIN)
  @Post('admins')
  @ApiOperation({ summary: 'Create an admin account (Super Admin only)' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'Email is already registered' })
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.users.createAdmin(dto);
  }

  // `me` routes are declared before `:id` so the static segment wins routing.
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @Get('me')
  @ApiOperation({ summary: 'Get the signed-in user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  getMe(@CurrentUser() actor: JwtPayload) {
    return this.users.getMe(actor.sub);
  }

  @Roles(Role.CUSTOMER, Role.ADMIN)
  @Patch('me')
  @ApiOperation({
    summary: 'Update the signed-in user profile',
    description: 'Updates first/last name and Bangladeshi phone. Email cannot be changed here.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'Phone number is already registered' })
  updateMe(@CurrentUser() actor: JwtPayload, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(actor.sub, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List users (cursor-paginated)',
    description: 'Admins see customer accounts only; Super Admin sees every account.',
  })
  @ApiOkResponse({ type: [UserResponseDto] })
  list(@CurrentUser() actor: JwtPayload, @Query() query: ListUsersQueryDto) {
    return this.users.list(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  getById(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.getById(actor, id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Activate or suspend an account',
    description:
      'Suspension revokes every session. Admins may only manage customers; Super Admin accounts cannot be managed by anyone.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  updateStatus(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.users.updateStatus(actor, id, dto.status);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch(':id/role')
  @ApiOperation({
    summary: 'Change a user role (Super Admin only)',
    description:
      'Assignable roles: ADMIN, CUSTOMER. SUPER_ADMIN can never be assigned. A role change revokes every session of the target user.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  updateRole(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.users.updateRole(actor, id, dto.role);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Soft-delete an account',
    description:
      'Marks the account deleted, anonymizes the email, and revokes every session. Admins may only delete customers.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'User not found' })
  softDelete(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.softDelete(actor, id);
  }
}
