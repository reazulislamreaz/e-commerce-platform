import type { ContactAckEmail } from '../mail.types';
import { escapeHtml, renderEmailShell } from './email-shell';
import type { RenderedEmail } from './verification-email.template';

export function renderContactAckEmail({ name, subject }: ContactAckEmail): RenderedEmail {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return {
    subject: 'We received your message — Elevate Apparel',
    text: [
      greeting,
      '',
      `Thanks for contacting Elevate Apparel about "${subject}".`,
      'Our team will review your message and respond as soon as possible.',
    ].join('\n'),
    html: renderEmailShell({
      title: 'Message received',
      preview: 'We received your contact form message.',
      greeting,
      bodyHtml: `Thanks for contacting Elevate Apparel about <strong style="color:#ffffff;">${escapeHtml(subject)}</strong>. Our team will review your message and respond as soon as possible.`,
    }),
  };
}
