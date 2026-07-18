import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ReturnStatus } from '@/generated/prisma/client';

function normalizeReturnStatus(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim().toUpperCase();
}

export class ListReturnsQueryDto {
  @ApiPropertyOptional({ description: 'Cursor: id of the last return from the previous page' })
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

  @ApiPropertyOptional({ enum: ReturnStatus })
  @IsOptional()
  @Transform(({ value }) => normalizeReturnStatus(value))
  @IsEnum(ReturnStatus)
  status?: ReturnStatus;
}
