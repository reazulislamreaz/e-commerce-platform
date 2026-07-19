import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  EMAIL_JOB_OPTIONS,
  EMAIL_QUEUE,
  EmailJobName,
  type AbandonedCartEmail,
  type ContactAckEmail,
  type ContactInternalEmail,
  type NewsletterWelcomeEmail,
  type OrderConfirmationEmail,
  type OrderStatusEmail,
  type PaymentConfirmationEmail,
  type PasswordResetEmail,
  type ShippingUpdateEmail,
  type DeliveredEmail,
  type VerificationEmail,
  type WelcomeEmail,
} from './mail.types';

/**
 * Email producer. Delivery runs on the BullMQ `email` queue so HTTP requests
 * never wait on SMTP; retries with backoff are handled by the queue.
 */
@Injectable()
export class MailService {
  constructor(@InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue) {}

  async sendEmailVerification(email: VerificationEmail): Promise<void> {
    await this.emailQueue.add(EmailJobName.VERIFICATION, email, EMAIL_JOB_OPTIONS);
  }

  async sendPasswordReset(email: PasswordResetEmail): Promise<void> {
    await this.emailQueue.add(EmailJobName.PASSWORD_RESET, email, EMAIL_JOB_OPTIONS);
  }

  async sendWelcome(email: WelcomeEmail): Promise<void> {
    await this.emailQueue.add(EmailJobName.WELCOME, email, EMAIL_JOB_OPTIONS);
  }

  async sendOrderConfirmation(email: OrderConfirmationEmail): Promise<void> {
    await this.emailQueue.add(EmailJobName.ORDER_CONFIRMATION, email, EMAIL_JOB_OPTIONS);
  }

  async sendOrderStatus(email: OrderStatusEmail): Promise<void> {
    await this.emailQueue.add(EmailJobName.ORDER_STATUS, email, EMAIL_JOB_OPTIONS);
  }

  async sendShippingUpdate(email: ShippingUpdateEmail): Promise<void> {
    await this.emailQueue.add(EmailJobName.SHIPPING_UPDATE, email, EMAIL_JOB_OPTIONS);
  }

  async sendDelivered(email: DeliveredEmail): Promise<void> {
    await this.emailQueue.add(EmailJobName.DELIVERED, email, EMAIL_JOB_OPTIONS);
  }

  async sendPaymentConfirmation(email: PaymentConfirmationEmail): Promise<void> {
    await this.emailQueue.add(EmailJobName.PAYMENT_CONFIRMATION, email, EMAIL_JOB_OPTIONS);
  }

  async sendAbandonedCart(
    email: AbandonedCartEmail,
    options?: { jobId?: string },
  ): Promise<void> {
    try {
      await this.emailQueue.add(EmailJobName.ABANDONED_CART, email, {
        ...EMAIL_JOB_OPTIONS,
        ...(options?.jobId ? { jobId: options.jobId } : {}),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      // Retried recovery jobs must not enqueue duplicate reminders.
      if (options?.jobId && message.includes('Job') && message.includes('already exists')) {
        return;
      }
      throw error;
    }
  }

  async sendContactAck(email: ContactAckEmail): Promise<void> {
    await this.emailQueue.add(EmailJobName.CONTACT_ACK, email, EMAIL_JOB_OPTIONS);
  }

  async sendContactInternal(email: ContactInternalEmail): Promise<void> {
    await this.emailQueue.add(EmailJobName.CONTACT_INTERNAL, email, EMAIL_JOB_OPTIONS);
  }

  async sendNewsletterWelcome(email: NewsletterWelcomeEmail): Promise<void> {
    await this.emailQueue.add(EmailJobName.NEWSLETTER_WELCOME, email, EMAIL_JOB_OPTIONS);
  }
}
