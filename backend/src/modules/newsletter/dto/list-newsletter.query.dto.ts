import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { NewsletterStatus } from '@/generated/prisma/client';
import { OffsetPaginationQueryDto } from '@/common/pagination/offset-pagination.query.dto';

function normalizeStatus(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim().toUpperCase();
}

export class ListNewsletterSubscriptionsQueryDto extends OffsetPaginationQueryDto {
  @ApiPropertyOptional({ enum: NewsletterStatus })
  @IsOptional()
  @Transform(({ value }) => normalizeStatus(value))
  @IsEnum(NewsletterStatus)
  status?: NewsletterStatus;
}
