import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateUserNotesDto {
  @ApiProperty({ description: 'Internal admin notes for this account', maxLength: 5000 })
  @IsString()
  @MaxLength(5000)
  notes!: string;
}
