import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { ContactMessageStatus } from '@/generated/prisma/client';

function normalizeStatus(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim().toUpperCase();
}

export class ListContactMessagesQueryDto {
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
