import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SalesGranularity {
  DAY = 'day',
  MONTH = 'month',
}

export class SalesQueryDto {
  @ApiPropertyOptional({ enum: SalesGranularity, default: SalesGranularity.DAY })
  @IsOptional()
  @IsEnum(SalesGranularity)
  granularity: SalesGranularity = SalesGranularity.DAY;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class BestsellersQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;
}
