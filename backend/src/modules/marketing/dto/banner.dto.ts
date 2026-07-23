import { PartialType } from '@nestjs/swagger';
import { BannerPlacement, BannerStatus } from '@/generated/prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { OffsetPaginationQueryDto } from '@/common/pagination/offset-pagination.query.dto';

export class ListPublicBannersQueryDto {
  @IsEnum(BannerPlacement)
  placement!: BannerPlacement;
}

export class ListAdminBannersQueryDto extends OffsetPaginationQueryDto {}

export class CreateBannerDto {
  @IsEnum(BannerPlacement)
  placement!: BannerPlacement;

  @IsOptional()
  @IsEnum(BannerStatus)
  status?: BannerStatus;

  @IsString()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  ctaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ctaHref?: string;

  @IsString()
  @MaxLength(1000)
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mobileImageUrl?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  @Max(10_000)
  position?: number;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsISO8601()
  endsAt?: string | null;
}

export class UpdateBannerDto extends PartialType(CreateBannerDto) {}
