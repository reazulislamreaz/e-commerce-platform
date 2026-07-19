import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportExportFormat, ReportExportType } from '@/generated/prisma/client';

export class ReportExportParamsDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CreateReportExportDto {
  @ApiProperty({ enum: ReportExportType })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(ReportExportType)
  type!: ReportExportType;

  @ApiProperty({ enum: ReportExportFormat, example: 'CSV' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(ReportExportFormat)
  format!: ReportExportFormat;

  @ApiPropertyOptional({ type: ReportExportParamsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ReportExportParamsDto)
  params?: ReportExportParamsDto;
}
