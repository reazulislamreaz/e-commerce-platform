import type { JobsOptions } from 'bullmq';

export const EMAIL_QUEUE = 'email';

/** Shared BullMQ options for transactional email producers (MailService + outbox). */
export const EMAIL_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 3_000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 1_000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

export enum EmailJobName {
  VERIFICATION = 'verification-email',
  WELCOME = 'welcome-email',
  PASSWORD_RESET = 'password-reset-email',
  ORDER_CONFIRMATION = 'order-confirmation-email',
  ORDER_STATUS = 'order-status-email',
  SHIPPING_UPDATE = 'shipping-update-email',
  DELIVERED = 'delivered-email',
  PAYMENT_CONFIRMATION = 'payment-confirmation-email',
  ABANDONED_CART = 'abandoned-cart-email',
  CONTACT_ACK = 'contact-ack-email',
  CONTACT_INTERNAL = 'contact-internal-email',
  NEWSLETTER_WELCOME = 'newsletter-welcome-email',
}

export interface VerificationEmail {
  to: string;
  firstName: string;
  verifyUrl: string;
}

export interface PasswordResetEmail {
  to: string;
  firstName: string;
  resetUrl: string;
}

export interface WelcomeEmail {
  to: string;
  firstName: string;
  shopUrl: string;
}

export interface OrderConfirmationEmail {
  to: string;
  firstName: string;
  orderNumber: string;
  totalTaka: number;
  trackUrl: string;
  items?: Array<{
    name: string;
    size: string;
    color: string;
    quantity: number;
    unitPriceTaka: number;
  }>;
  subtotalTaka?: number;
  shippingTaka?: number;
  discountTaka?: number;
}

export interface OrderStatusEmail {
  to: string;
  firstName: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string;
  orderUrl: string;
}

export interface ShippingUpdateEmail extends OrderStatusEmail {
  trackingNumber: string;
  carrier?: string;
}

export interface DeliveredEmail {
  to: string;
  firstName: string;
  orderNumber: string;
  orderUrl: string;
}

export interface PaymentConfirmationEmail extends DeliveredEmail {
  totalTaka: number;
  paymentMethod: string;
}

export interface AbandonedCartEmail {
  to: string;
  firstName: string;
  cartUrl: string;
  items: Array<{ name: string; quantity: number }>;
}

export interface ContactAckEmail {
  to: string;
  name: string;
  subject: string;
}

export interface ContactInternalEmail {
  to: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  messageId: string;
}

export interface NewsletterWelcomeEmail {
  to: string;
  unsubscribeUrl: string;
}
