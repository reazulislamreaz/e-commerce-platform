import type { AbandonedCartEmail } from '../mail.types';
import { escapeHtml, renderEmailShell } from './email-shell';
import type { RenderedEmail } from './verification-email.template';

export function renderAbandonedCartEmail(email: AbandonedCartEmail): RenderedEmail {
  const greeting = email.firstName ? `Hi ${email.firstName},` : 'Hi,';
  const itemText = email.items
    .slice(0, 5)
    .map((item) => `${item.name} × ${item.quantity}`)
    .join(', ');
  const itemHtml =
    email.items.length > 0
      ? `<ul style="margin:14px 0 0;padding-left:20px;">${email.items
          .slice(0, 5)
          .map(
            (item) =>
              `<li style="margin:5px 0;color:#eee9e1;">${escapeHtml(item.name)} × ${item.quantity}</li>`,
          )
          .join('')}</ul>`
      : '';
  return {
    subject: 'Your Elevate bag is waiting',
    text: `${greeting}\n\nYou left something in your bag${itemText ? `: ${itemText}` : ''}. Stock is limited.\n\n${email.cartUrl}`,
    html: renderEmailShell({
      title: 'Still thinking it over?',
      preview: 'The pieces in your bag are still waiting.',
      greeting,
      bodyHtml: `The pieces in your bag are still waiting. Complete your order while stock lasts.${itemHtml}`,
      cta: { label: 'Return to Bag', url: email.cartUrl },
      footer: 'Availability is not guaranteed until checkout is complete.',
    }),
  };
}
