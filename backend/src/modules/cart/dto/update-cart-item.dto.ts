import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({ minimum: 0, description: 'Absolute quantity; 0 removes the line' })
  @IsInt()
  @Min(0)
  quantity!: number;
}
