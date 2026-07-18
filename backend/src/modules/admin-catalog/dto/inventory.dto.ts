import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class ListInventoryBalancesQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Cursor: balance id from the previous page' })
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

export class ListInventoryMovementsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({ description: 'Cursor: movement id from the previous page' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class InventoryAdjustmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  variantId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  locationId!: string;

  @ApiProperty({ example: 5, description: 'Positive to add stock, negative to remove' })
  @Type(() => Number)
  @IsInt()
  quantityDelta!: number;

  @ApiProperty({ example: 'adjust:20260718:001' })
  @IsString()
  @MaxLength(160)
  idempotencyKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: 'Optimistic concurrency token for the balance row' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedVersion?: number;
}

export class InventoryBalanceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  variantId!: string;

  @ApiProperty()
  variantSku!: string;

  @ApiProperty({ format: 'uuid' })
  locationId!: string;

  @ApiProperty()
  locationCode!: string;

  @ApiProperty()
  onHand!: number;

  @ApiProperty()
  reserved!: number;

  @ApiProperty()
  available!: number;

  @ApiProperty()
  version!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class InventoryMovementResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ format: 'uuid' })
  variantId!: string;

  @ApiProperty({ format: 'uuid' })
  locationId!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  balanceAfter!: number;

  @ApiPropertyOptional()
  note?: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}

export class InventoryLocationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isActive!: boolean;
}
