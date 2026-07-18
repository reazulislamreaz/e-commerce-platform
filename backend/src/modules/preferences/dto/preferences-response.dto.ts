import { ApiProperty } from '@nestjs/swagger';

export class PreferencesResponseDto {
  @ApiProperty({ example: true })
  emailOrderUpdates!: boolean;

  @ApiProperty({ example: false })
  emailMarketing!: boolean;

  @ApiProperty({ example: true })
  inAppEnabled!: boolean;
}
