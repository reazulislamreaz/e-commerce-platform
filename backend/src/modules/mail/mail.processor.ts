import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { createTransport, type Transporter } from 'nodemailer';
import {
  EMAIL_QUEUE,
  EmailJobName,
  type AbandonedCartEmail,
  type ContactAckEmail,
  type ContactInternalEmail,
  type NewsletterWelcomeEmail,
  type DeliveredEmail,
  type PaymentConfirmationEmail,
  type PasswordResetEmail,
  type ReturnStatusEmail,
  type ShippingUpdateEmail,
  type VerificationEmail,
  type WelcomeEmail,
} from './mail.types';
import { renderContactAckEmail } from './templates/contact-ack-email.template';
import { renderContactInternalEmail } from './templates/contact-internal-email.template';
import { renderNewsletterWelcomeEmail } from './templates/newsletter-welcome-email.template';
import { renderOrderConfirmationEmail } from './templates/order-confirmation-email.template';
import { renderOrderStatusEmail } from './templates/order-status-email.template';
import { renderPasswordResetEmail } from './templates/password-reset-email.template';
import { renderWelcomeEmail } from './templates/welcome-email.template';
import { renderShippingUpdateEmail } from './templates/shipping-update-email.template';
import { renderDeliveredEmail } from './templates/delivered-email.template';
import { renderPaymentConfirmationEmail } from './templates/payment-confirmation-email.template';
import { renderReturnStatusEmail } from './templates/return-status-email.template';
import { renderAbandonedCartEmail } from './templates/abandoned-cart-email.template';
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
      case EmailJobName.WELCOME: {
        const email = job.data as WelcomeEmail;
        await this.deliver(email.to, renderWelcomeEmail(email));
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
              : `${this.frontendOrigin}/track-order?number=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(customerEmail)}`,
          items: Array.isArray(payload.items)
            ? (payload.items as Array<{
                name: string;
                size: string;
                color: string;
                quantity: number;
                unitPriceTaka: number;
              }>)
            : undefined,
          subtotalTaka: typeof payload.subtotalTaka === 'number' ? payload.subtotalTaka : undefined,
          shippingTaka: typeof payload.shippingTaka === 'number' ? payload.shippingTaka : undefined,
          discountTaka: typeof payload.discountTaka === 'number' ? payload.discountTaka : undefined,
        });
        await this.deliver(customerEmail, rendered, rendered.text);
        return;
      }
      case EmailJobName.ORDER_STATUS: {
        const payload = job.data as Record<string, unknown>;
        const orderNumber = String(payload.orderNumber ?? '');
        const customerEmail = String(payload.to ?? payload.email ?? '');
        const orderUrlRaw =
          typeof payload.orderUrl === 'string'
            ? payload.orderUrl
            : `${this.frontendOrigin}/account/orders`;
        const rendered = renderOrderStatusEmail({
          to: customerEmail,
          firstName: typeof payload.firstName === 'string' ? payload.firstName : '',
          orderNumber,
          status: String(payload.status ?? 'updated'),
          trackingNumber:
            typeof payload.trackingNumber === 'string' ? payload.trackingNumber : undefined,
          orderUrl: orderUrlRaw.startsWith('http')
            ? orderUrlRaw
            : `${this.frontendOrigin}${orderUrlRaw}`,
        });
        await this.deliver(customerEmail, rendered, rendered.text);
        return;
      }
      case EmailJobName.SHIPPING_UPDATE: {
        const email = job.data as ShippingUpdateEmail;
        await this.deliver(
          email.to,
          renderShippingUpdateEmail({
            ...email,
            orderUrl: this.absoluteUrl(email.orderUrl),
          }),
          email.trackingNumber,
        );
        return;
      }
      case EmailJobName.DELIVERED: {
        const email = job.data as DeliveredEmail;
        await this.deliver(
          email.to,
          renderDeliveredEmail({ ...email, orderUrl: this.absoluteUrl(email.orderUrl) }),
        );
        return;
      }
      case EmailJobName.PAYMENT_CONFIRMATION: {
        const email = job.data as PaymentConfirmationEmail;
        await this.deliver(
          email.to,
          renderPaymentConfirmationEmail({
            ...email,
            orderUrl: this.absoluteUrl(email.orderUrl),
          }),
        );
        return;
      }
      case EmailJobName.RETURN_STATUS: {
        const email = job.data as ReturnStatusEmail;
        await this.deliver(
          email.to,
          renderReturnStatusEmail({
            ...email,
            requestUrl: this.absoluteUrl(email.requestUrl),
          }),
        );
        return;
      }
      case EmailJobName.ABANDONED_CART: {
        const email = job.data as AbandonedCartEmail;
        await this.deliver(email.to, renderAbandonedCartEmail(email));
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

  private absoluteUrl(pathOrUrl: string): string {
    if (!pathOrUrl) return `${this.frontendOrigin}/account/orders`;
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
    return `${this.frontendOrigin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
  }

  private async deliver(to: string, rendered: RenderedEmail, logHint?: string): Promise<void> {
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
