import type { ShippingUpdateEmail } from '../mail.types';
import { escapeHtml, renderEmailShell } from './email-shell';
import type { RenderedEmail } from './verification-email.template';

export function renderShippingUpdateEmail(email: ShippingUpdateEmail): RenderedEmail {
  const greeting = email.firstName ? `Hi ${email.firstName},` : 'Hi,';
  const carrier = email.carrier ? ` with ${escapeHtml(email.carrier)}` : '';
  return {
    subject: `Your order has shipped — ${email.orderNumber}`,
    text: `${greeting}\n\nOrder ${email.orderNumber} has shipped${email.carrier ? ` with ${email.carrier}` : ''}.\nTracking number: ${email.trackingNumber}\n\n${email.orderUrl}`,
    html: renderEmailShell({
      title: 'Your order is on the way',
      preview: `Order ${email.orderNumber} has shipped.`,
      greeting,
      bodyHtml: `Order <strong style="color:#fff;">${escapeHtml(email.orderNumber)}</strong> has shipped${carrier}.<br/><br/>Tracking number: <strong style="color:#e3bb78;">${escapeHtml(email.trackingNumber)}</strong>`,
      cta: { label: 'Track Order', url: email.orderUrl },
      footer: 'Tracking updates may take a few hours to appear.',
    }),
  };
}
