import { Module } from '@nestjs/common';
import { AdminNewsletterController, NewsletterController } from './newsletter.controller';
import { NewsletterRepository } from './newsletter.repository';
import { NewsletterService } from './newsletter.service';

@Module({
  controllers: [NewsletterController, AdminNewsletterController],
  providers: [NewsletterRepository, NewsletterService],
})
export class NewsletterModule {}
