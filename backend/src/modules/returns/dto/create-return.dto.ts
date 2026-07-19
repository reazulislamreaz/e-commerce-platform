import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  Equals,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateReturnItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  orderItemId!: string;

  @ApiProperty({ minimum: 1, maximum: 99 })
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Replacement variant for exchange lines (required when type is exchange).',
  })
  @IsOptional()
  @IsUUID()
  exchangeVariantId?: string;
}

export class CreateReturnDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  orderId!: string;

  @ApiProperty({ enum: ['return', 'exchange'] })
  @IsEnum(['return', 'exchange'] as const)
  type!: 'return' | 'exchange';

  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  reason!: string;

  @ApiProperty({
    description: 'Customer attestation that items are unworn with tags attached.',
    example: true,
  })
  @IsBoolean()
  @Equals(true, {
    message: 'You must attest that items are unworn with tags attached',
  })
  conditionAttested!: boolean;

  @ApiPropertyOptional({
    type: [CreateReturnItemDto],
    description: 'When omitted, all order lines are included at full quantity.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateReturnItemDto)
  items?: CreateReturnItemDto[];
}
