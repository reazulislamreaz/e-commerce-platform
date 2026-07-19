import type { DeliveredEmail } from '../mail.types';
import { escapeHtml, renderEmailShell } from './email-shell';
import type { RenderedEmail } from './verification-email.template';

export function renderDeliveredEmail(email: DeliveredEmail): RenderedEmail {
  const greeting = email.firstName ? `Hi ${email.firstName},` : 'Hi,';
  return {
    subject: `Delivered — ${email.orderNumber}`,
    text: `${greeting}\n\nOrder ${email.orderNumber} has been delivered. We hope you love it.\n\n${email.orderUrl}`,
    html: renderEmailShell({
      title: 'Delivered',
      preview: `Order ${email.orderNumber} has been delivered.`,
      greeting,
      bodyHtml: `Order <strong style="color:#fff;">${escapeHtml(email.orderNumber)}</strong> has been delivered. We hope every piece feels just right.`,
      cta: { label: 'View Order', url: email.orderUrl },
      footer: 'Need help? Reply to this email and our team will assist you.',
    }),
  };
}
