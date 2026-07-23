import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsUUID } from 'class-validator';

export enum BulkUserAction {
  ACTIVATE = 'ACTIVATE',
  SUSPEND = 'SUSPEND',
  VERIFY = 'VERIFY',
  SOFT_DELETE = 'SOFT_DELETE',
  RESTORE = 'RESTORE',
}

export class BulkUsersDto {
  @ApiProperty({ type: [String], description: 'User ids to act on (max 100)' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids!: string[];

  @ApiProperty({ enum: BulkUserAction })
  @IsEnum(BulkUserAction)
  action!: BulkUserAction;
}

export class BulkUsersResultDto {
  @ApiProperty()
  processed!: number;

  @ApiProperty({ type: [String] })
  skipped!: string[];
}
