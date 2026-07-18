import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NewsletterSubscribeResponseDto {
  @ApiProperty({ example: 'You are subscribed to Elevate Apparel updates.' })
  message!: string;
}

export class NewsletterUnsubscribeResponseDto {
  @ApiProperty({ example: 'You have been unsubscribed.' })
  message!: string;
}

export class NewsletterSubscriptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: ['active', 'unsubscribed', 'bounced'] })
  status!: 'active' | 'unsubscribed' | 'bounced';

  @ApiProperty({ format: 'date-time' })
  consentAt!: string;

  @ApiPropertyOptional()
  source?: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiPropertyOptional({ format: 'date-time' })
  unsubscribedAt?: string;
}
