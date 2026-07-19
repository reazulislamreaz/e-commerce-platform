import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { CustomerSegmentKey } from '@/generated/prisma/client';

export enum CustomerSort {
  RECENT = 'RECENT',
  HIGH_VALUE = 'HIGH_VALUE',
}

export class ListCustomersQueryDto {
  @ApiPropertyOptional({ description: 'Customer id cursor from the previous page' })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Matches name, email, or phone', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional({ enum: CustomerSegmentKey })
  @IsOptional()
  @IsEnum(CustomerSegmentKey)
  segment?: CustomerSegmentKey;

  @ApiPropertyOptional({ enum: CustomerSort, default: CustomerSort.RECENT })
  @IsOptional()
  @IsEnum(CustomerSort)
  sort: CustomerSort = CustomerSort.RECENT;
}

export class CustomerCursorQueryDto {
  @ApiPropertyOptional({ description: 'Row cursor from the previous page' })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class ActivityCursorQueryDto {
  @ApiPropertyOptional({ description: 'Numeric activity id cursor from the previous page' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  @MaxLength(100)
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
