import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { createTransport, type Transporter } from 'nodemailer';
import {
  EMAIL_QUEUE,
  EmailJobName,
  type PasswordResetEmail,
  type VerificationEmail,
} from './mail.types';
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

  constructor(config: ConfigService) {
    super();
    const user = config.get<string>('SMTP_USER');
    this.from = config.get<string>('MAIL_FROM') ?? '';
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
      default:
        this.logger.warn(`Unknown email job "${job.name}" (id ${job.id ?? 'n/a'}) skipped`);
    }
  }

  private async deliver(to: string, rendered: RenderedEmail, actionUrl: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[SMTP not configured] "${rendered.subject}" link for ${to}: ${actionUrl}`);
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
