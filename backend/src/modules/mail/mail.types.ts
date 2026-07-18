export const EMAIL_QUEUE = 'email';

export enum EmailJobName {
  VERIFICATION = 'verification-email',
  PASSWORD_RESET = 'password-reset-email',
  ORDER_CONFIRMATION = 'order-confirmation-email',
  ORDER_STATUS = 'order-status-email',
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

export interface OrderConfirmationEmail {
  to: string;
  firstName: string;
  orderNumber: string;
  totalTaka: number;
  trackUrl: string;
}

export interface OrderStatusEmail {
  to: string;
  firstName: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string;
  orderUrl: string;
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
