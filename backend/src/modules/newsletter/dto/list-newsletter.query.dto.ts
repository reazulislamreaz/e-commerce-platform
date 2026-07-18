import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { NewsletterStatus } from '@/generated/prisma/client';

function normalizeStatus(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim().toUpperCase();
}

export class ListNewsletterSubscriptionsQueryDto {
  @ApiPropertyOptional()
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

  @ApiPropertyOptional({ enum: NewsletterStatus })
  @IsOptional()
  @Transform(({ value }) => normalizeStatus(value))
  @IsEnum(NewsletterStatus)
  status?: NewsletterStatus;
}
