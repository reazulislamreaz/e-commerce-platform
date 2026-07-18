import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { createTransport, type Transporter } from 'nodemailer';
import {
  EMAIL_QUEUE,
  EmailJobName,
  type ContactAckEmail,
  type ContactInternalEmail,
  type NewsletterWelcomeEmail,
  type PasswordResetEmail,
  type VerificationEmail,
} from './mail.types';
import { renderContactAckEmail } from './templates/contact-ack-email.template';
import { renderContactInternalEmail } from './templates/contact-internal-email.template';
import { renderNewsletterWelcomeEmail } from './templates/newsletter-welcome-email.template';
import { renderOrderConfirmationEmail } from './templates/order-confirmation-email.template';
import { renderOrderStatusEmail } from './templates/order-status-email.template';
import { renderPasswordResetEmail } from './templates/password-reset-email.template';
import {
  renderVerificationEmail,
  type RenderedEmail,
} from './templates/verification-email.template';

/**
 * Email worker. Sends through SMTP when credentials are configured;
 * otherwise (local development without SMTP_USER) it logs the message so the
 * flow stays testable without a mail account.
 */
@Processor(EMAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly frontendOrigin: string;

  constructor(config: ConfigService) {
    super();
    const user = config.get<string>('SMTP_USER');
    this.from = config.get<string>('MAIL_FROM') ?? '';
    this.frontendOrigin = config.getOrThrow<string>('FRONTEND_ORIGIN').replace(/\/$/, '');
    this.transporter = user
      ? createTransport({
          host: config.getOrThrow<string>('SMTP_HOST'),
          port: config.getOrThrow<number>('SMTP_PORT'),
          secure: config.getOrThrow<boolean>('SMTP_SECURE'),
          auth: { user, pass: config.getOrThrow<string>('SMTP_PASSWORD') },
        })
      : null;
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case EmailJobName.VERIFICATION: {
        const email = job.data as VerificationEmail;
        await this.deliver(email.to, renderVerificationEmail(email), email.verifyUrl);
        return;
      }
      case EmailJobName.PASSWORD_RESET: {
        const email = job.data as PasswordResetEmail;
        await this.deliver(email.to, renderPasswordResetEmail(email), email.resetUrl);
        return;
      }
      case EmailJobName.ORDER_CONFIRMATION: {
        const payload = job.data as Record<string, unknown>;
        const orderNumber = String(payload.orderNumber ?? '');
        const customerEmail = String(payload.to ?? payload.email ?? '');
        const rendered = renderOrderConfirmationEmail({
          to: customerEmail,
          firstName: typeof payload.firstName === 'string' ? payload.firstName : '',
          orderNumber,
          totalTaka: Number(payload.totalTaka ?? 0),
          trackUrl:
            typeof payload.trackUrl === 'string'
              ? payload.trackUrl
              : `${this.frontendOrigin}/orders/track?number=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(customerEmail)}`,
        });
        await this.deliver(customerEmail, rendered, rendered.text);
        return;
      }
      case EmailJobName.ORDER_STATUS: {
        const payload = job.data as Record<string, unknown>;
        const orderNumber = String(payload.orderNumber ?? '');
        const customerEmail = String(payload.to ?? payload.email ?? '');
        const rendered = renderOrderStatusEmail({
          to: customerEmail,
          firstName: typeof payload.firstName === 'string' ? payload.firstName : '',
          orderNumber,
          status: String(payload.status ?? 'updated'),
          trackingNumber:
            typeof payload.trackingNumber === 'string' ? payload.trackingNumber : undefined,
          orderUrl:
            typeof payload.orderUrl === 'string'
              ? payload.orderUrl
              : `${this.frontendOrigin}/account/orders`,
        });
        await this.deliver(customerEmail, rendered, rendered.text);
        return;
      }
      case EmailJobName.CONTACT_ACK: {
        const email = job.data as ContactAckEmail;
        const rendered = renderContactAckEmail(email);
        await this.deliver(email.to, rendered);
        return;
      }
      case EmailJobName.CONTACT_INTERNAL: {
        const email = job.data as ContactInternalEmail;
        const rendered = renderContactInternalEmail(email);
        await this.deliver(email.to, rendered);
        return;
      }
      case EmailJobName.NEWSLETTER_WELCOME: {
        const email = job.data as NewsletterWelcomeEmail;
        const rendered = renderNewsletterWelcomeEmail(email);
        await this.deliver(email.to, rendered, email.unsubscribeUrl);
        return;
      }
      default:
        this.logger.warn(`Unknown email job "${job.name}" (id ${job.id ?? 'n/a'}) skipped`);
    }
  }

  private async deliver(
    to: string,
    rendered: RenderedEmail,
    logHint?: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[SMTP not configured] "${rendered.subject}" for ${to}${logHint ? `: ${logHint}` : ''}`,
      );
      return;
    }
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
    this.logger.log(`"${rendered.subject}" email sent to ${to}`);
  }
}
