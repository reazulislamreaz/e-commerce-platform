import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export enum BulkOrderAction {
  CONFIRM = 'CONFIRM',
  START_PROCESSING = 'START_PROCESSING',
  MARK_PACKED = 'MARK_PACKED',
  SHIP = 'SHIP',
  CANCEL = 'CANCEL',
  EXPORT = 'EXPORT',
}

export class BulkOrdersDto {
  @ApiProperty({ type: [String], description: 'Order ids (max 100)' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids!: string[];

  @ApiProperty({ enum: BulkOrderAction })
  @IsEnum(BulkOrderAction)
  action!: BulkOrderAction;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  deliveryPartnerId?: string;

  @ApiPropertyOptional({
    description: 'Shared tracking number for bulk SHIP when orders lack one',
    minLength: 4,
    maxLength: 40,
  })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @ValidateIf((o: BulkOrdersDto) => o.action === BulkOrderAction.SHIP)
  @IsString()
  @MinLength(4)
  @MaxLength(40)
  trackingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(500)
  trackingUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(500)
  shippingNote?: string;
}

export class BulkOrdersResultDto {
  @ApiProperty()
  processed!: number;

  @ApiProperty({ type: [String] })
  succeeded!: string[];

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: { id: { type: 'string' }, reason: { type: 'string' } },
    },
  })
  failed!: Array<{ id: string; reason: string }>;

  @ApiPropertyOptional({ description: 'CSV content when action is EXPORT' })
  csv?: string;
}

export class UpdateOrderNotesDto {
  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  notes!: string;
}
