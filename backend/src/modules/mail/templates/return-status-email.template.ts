import type { ReturnStatusEmail } from '../mail.types';
import { escapeHtml, renderEmailShell } from './email-shell';
import type { RenderedEmail } from './verification-email.template';

export function renderReturnStatusEmail(email: ReturnStatusEmail): RenderedEmail {
  const requestType = email.requestType === 'exchange' ? 'exchange' : 'return';
  const title = `${capitalize(requestType)} update`;
  const greeting = email.firstName ? `Hi ${email.firstName},` : 'Hi,';
  const noteText = email.note?.trim();
  const noteHtml = noteText
    ? `<br/><br/>Note: <span style="color:#ffffff;">${escapeHtml(noteText)}</span>`
    : '';

  return {
    subject: `${title} — ${email.orderNumber}`,
    text: [
      greeting,
      '',
      `Your ${requestType} request for order ${email.orderNumber} is now ${email.status}.`,
      noteText ? `Note: ${noteText}` : '',
      '',
      `View your ${requestType}:`,
      email.requestUrl,
    ]
      .filter(Boolean)
      .join('\n'),
    html: renderEmailShell({
      title,
      preview: `Your ${requestType} request for order ${email.orderNumber} is now ${email.status}.`,
      greeting,
      bodyHtml: `Your ${requestType} request for order <strong style="color:#ffffff;">${escapeHtml(email.orderNumber)}</strong> is now <strong style="color:#e3bb78;">${escapeHtml(email.status)}</strong>.${noteHtml}`,
      cta: {
        label: `View ${capitalize(requestType)}`,
        url: email.requestUrl,
      },
      footer: 'Elevate Apparel customer care',
    }),
  };
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
