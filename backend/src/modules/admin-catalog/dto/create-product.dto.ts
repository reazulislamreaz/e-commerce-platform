import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateProductColorDto {
  @ApiProperty({ example: 'Black' })
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: '#111111' })
  @IsString()
  @MaxLength(7)
  hex!: string;
}

export class CreateProductVariantDto {
  @ApiProperty({ example: 'EA-HOOD-BLK-M' })
  @IsString()
  @MaxLength(64)
  sku!: string;

  @ApiProperty({ example: 'M' })
  @IsString()
  @MaxLength(32)
  size!: string;

  @ApiProperty({ example: 'Black' })
  @IsString()
  @MaxLength(80)
  color!: string;
}

export class CreateProductMediaDto {
  @ApiProperty({ example: 'https://cdn.example.com/hoodie.webp' })
  @IsString()
  @MaxLength(2048)
  url!: string;

  @ApiProperty({ example: 'Essential Hoodie front view' })
  @IsString()
  @MaxLength(240)
  alt!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateProductPriceDto {
  @ApiProperty({ example: 2499, description: 'Sale price in taka' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountTaka!: number;

  @ApiPropertyOptional({ example: 2999, description: 'Compare-at price in taka' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  compareAtTaka?: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Essential Hoodie' })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({
    example: 'essential-hoodie',
    description: 'Generated from name when omitted',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  brandId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ example: 'Black' })
  @IsString()
  @MaxLength(80)
  primaryColor!: string;

  @ApiProperty({ type: [String], description: 'Leaf category ids' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  categoryIds!: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  collectionIds?: string[];

  @ApiProperty({ type: [CreateProductColorDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductColorDto)
  colors!: CreateProductColorDto[];

  @ApiProperty({ type: [CreateProductVariantDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants!: CreateProductVariantDto[];

  @ApiProperty({ type: [CreateProductMediaDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductMediaDto)
  media!: CreateProductMediaDto[];

  @ApiProperty({ type: CreateProductPriceDto })
  @ValidateNested()
  @Type(() => CreateProductPriceDto)
  price!: CreateProductPriceDto;
}
