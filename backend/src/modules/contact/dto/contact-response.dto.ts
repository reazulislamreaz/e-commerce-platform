import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactSubmitResponseDto {
  @ApiProperty({ example: 'Thank you for contacting us. We will respond shortly.' })
  message!: string;
}

export class ContactMessageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ enum: ['new', 'in_progress', 'resolved', 'spam'] })
  status!: 'new' | 'in_progress' | 'resolved' | 'spam';

  @ApiPropertyOptional()
  adminNotes?: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiPropertyOptional({ format: 'date-time' })
  resolvedAt?: string;
}
