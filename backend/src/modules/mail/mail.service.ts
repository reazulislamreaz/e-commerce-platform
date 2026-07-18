import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EMAIL_QUEUE, EmailJobName, type VerificationEmail } from './mail.types';

/**
 * Email producer. Delivery runs on the BullMQ `email` queue so HTTP requests
 * never wait on SMTP; retries with backoff are handled by the queue.
 */
@Injectable()
export class MailService {
  constructor(@InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue) {}

  async sendEmailVerification(email: VerificationEmail): Promise<void> {
    await this.emailQueue.add(EmailJobName.VERIFICATION, email, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 3_000 },
      removeOnComplete: { age: 24 * 60 * 60, count: 1_000 },
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    });
  }
}
