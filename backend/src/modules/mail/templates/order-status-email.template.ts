import type { OrderStatusEmail } from '../mail.types';
import { escapeHtml, renderEmailShell } from './email-shell';
import type { RenderedEmail } from './verification-email.template';

export function renderOrderStatusEmail(email: OrderStatusEmail): RenderedEmail {
  const greeting = email.firstName ? `Hi ${email.firstName},` : 'Hi,';
  const tracking = email.trackingNumber
    ? `<br/><br/>Tracking number: <strong style="color:#ffffff;">${escapeHtml(email.trackingNumber)}</strong>`
    : '';

  return {
    subject: `Order update — ${email.orderNumber}`,
    text: [
      greeting,
      '',
      `Your order ${email.orderNumber} is now ${email.status}.`,
      email.trackingNumber ? `Tracking number: ${email.trackingNumber}` : '',
      '',
      'View your order:',
      email.orderUrl,
    ]
      .filter(Boolean)
      .join('\n'),
    html: renderEmailShell({
      title: 'Order update',
      preview: `Order ${email.orderNumber} is now ${email.status}.`,
      greeting,
      bodyHtml: `Your order <strong style="color:#ffffff;">${escapeHtml(email.orderNumber)}</strong> is now <strong style="color:#e3bb78;">${escapeHtml(email.status)}</strong>.${tracking}`,
      cta: { label: 'View Order', url: email.orderUrl },
      footer: 'Thank you for shopping with Elevate Apparel.',
    }),
  };
}
