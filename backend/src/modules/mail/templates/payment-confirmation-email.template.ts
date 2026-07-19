import type { PaymentConfirmationEmail } from '../mail.types';
import { escapeHtml, renderEmailShell } from './email-shell';
import type { RenderedEmail } from './verification-email.template';

export function renderPaymentConfirmationEmail(email: PaymentConfirmationEmail): RenderedEmail {
  const greeting = email.firstName ? `Hi ${email.firstName},` : 'Hi,';
  const amount = `BDT ${email.totalTaka.toLocaleString('en-BD')}`;
  return {
    subject: `Payment received — ${email.orderNumber}`,
    text: `${greeting}\n\nWe received ${amount} by ${email.paymentMethod} for order ${email.orderNumber}.\n\n${email.orderUrl}`,
    html: renderEmailShell({
      title: 'Payment received',
      preview: `Payment received for order ${email.orderNumber}.`,
      greeting,
      bodyHtml: `We received <strong style="color:#e3bb78;">${escapeHtml(amount)}</strong> by ${escapeHtml(email.paymentMethod)} for order <strong style="color:#fff;">${escapeHtml(email.orderNumber)}</strong>.`,
      cta: { label: 'View Order', url: email.orderUrl },
      footer: 'Keep this email for your records.',
    }),
  };
}
