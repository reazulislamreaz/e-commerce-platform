import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Role, UserStatus } from '@/generated/prisma/client';

export enum UserListSort {
  CREATED_DESC = 'CREATED_DESC',
  CREATED_ASC = 'CREATED_ASC',
  NAME_ASC = 'NAME_ASC',
  NAME_DESC = 'NAME_DESC',
  LAST_LOGIN_DESC = 'LAST_LOGIN_DESC',
  ORDERS_DESC = 'ORDERS_DESC',
  SPENDING_DESC = 'SPENDING_DESC',
}

function optionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}

export class ListUsersQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20, description: 'Alias: limit' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 20,
    description: 'Page size (preferred over pageSize for CRM parity)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Matches email, phone, first name, or last name' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional({ enum: UserListSort, default: UserListSort.CREATED_DESC })
  @IsOptional()
  @IsEnum(UserListSort)
  sort: UserListSort = UserListSort.CREATED_DESC;

  @ApiPropertyOptional({ description: 'Registration date lower bound (ISO date)' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'Registration date upper bound (ISO date)' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by email verification (true = verified, false = unverified)',
  })
  @IsOptional()
  @Transform(({ value }) => optionalBoolean(value))
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({
    description: 'When true, only soft-deleted accounts (Super Admin / restore flows)',
  })
  @IsOptional()
  @Transform(({ value }) => optionalBoolean(value))
  @IsBoolean()
  deleted?: boolean;

  @ApiPropertyOptional({
    enum: [10, 20, 50, 100],
    description: 'Convenience alias accepted by admin UI page-size select',
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn([10, 20, 50, 100])
  size?: number;
}
