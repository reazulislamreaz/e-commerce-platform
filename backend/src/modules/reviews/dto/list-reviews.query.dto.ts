import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ReviewStatus } from '@/generated/prisma/client';

function normalizeReviewStatus(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim().toUpperCase();
}

export class ListReviewsQueryDto {
  @ApiPropertyOptional({ description: 'Cursor: id of the last review from the previous page' })
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

  @ApiPropertyOptional({ enum: ReviewStatus })
  @IsOptional()
  @Transform(({ value }) => normalizeReviewStatus(value))
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;
}
