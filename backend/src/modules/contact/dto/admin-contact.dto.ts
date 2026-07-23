import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ContactMessageStatus } from '@/generated/prisma/client';
import { OffsetPaginationQueryDto } from '@/common/pagination/offset-pagination.query.dto';

function normalizeStatus(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim().toUpperCase();
}

export class ListContactMessagesQueryDto extends OffsetPaginationQueryDto {
  @ApiPropertyOptional({ enum: ContactMessageStatus })
  @IsOptional()
  @Transform(({ value }) => normalizeStatus(value))
  @IsEnum(ContactMessageStatus)
  status?: ContactMessageStatus;
}

export class AdminUpdateContactMessageDto {
  @ApiPropertyOptional({ enum: ContactMessageStatus })
  @IsOptional()
  @Transform(({ value }) => normalizeStatus(value))
  @IsEnum(ContactMessageStatus)
  status?: ContactMessageStatus;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;
}
