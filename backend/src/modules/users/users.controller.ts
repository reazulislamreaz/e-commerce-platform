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
import { BulkUsersDto, BulkUsersResultDto } from './dto/bulk-users.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateUserNotesDto } from './dto/update-user-notes.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDetailResponseDto, UserResponseDto } from './dto/user-response.dto';
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
  createAdmin(@CurrentUser() actor: JwtPayload, @Body() dto: CreateAdminDto) {
    return this.users.createAdmin(actor, dto);
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
    summary: 'List users (offset-paginated)',
    description:
      'Admins see customer accounts only; Super Admin sees every account and may filter by role. Supports search, status, date range, verification, sort, and soft-deleted restore lists.',
  })
  @ApiOkResponse({ type: [UserResponseDto] })
  list(@CurrentUser() actor: JwtPayload, @Query() query: ListUsersQueryDto) {
    return this.users.list(actor, query);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Apply a bulk action to multiple accounts' })
  @ApiOkResponse({ type: BulkUsersResultDto })
  bulk(@CurrentUser() actor: JwtPayload, @Body() dto: BulkUsersDto) {
    return this.users.bulk(actor, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id (summary)' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  getById(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.getById(actor, id);
  }

  @Get(':id/detail')
  @ApiOperation({
    summary: 'Get a full user profile for admin management',
    description:
      'Includes addresses, orders, wishlist, reviews, activity, login history, notes, and audit trail.',
  })
  @ApiOkResponse({ type: UserDetailResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  getDetail(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.getDetail(actor, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit user profile fields (name, phone)' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'Phone number is already registered' })
  updateProfile(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.updateProfile(actor, id, dto);
  }

  @Patch(':id/notes')
  @ApiOperation({ summary: 'Update internal admin notes for an account' })
  @ApiOkResponse({ type: UserResponseDto })
  updateNotes(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserNotesDto,
  ) {
    return this.users.updateNotes(actor, id, dto.notes);
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

  @Post(':id/verify')
  @ApiOperation({ summary: 'Mark email verified and activate pending accounts' })
  @ApiOkResponse({ type: UserResponseDto })
  verify(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.verify(actor, id);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Email a password-reset link to an active account' })
  @ApiOkResponse({ description: 'Reset email queued when the account is eligible' })
  sendPasswordReset(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.sendPasswordReset(actor, id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted account' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'Restored email or phone is already in use' })
  restore(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.restore(actor, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Soft-delete an account',
    description:
      'Marks the account deleted, anonymizes the email/phone (preserving originals for restore), and revokes every session. Admins may only delete customers.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'User not found' })
  softDelete(@CurrentUser() actor: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.softDelete(actor, id);
  }
}
