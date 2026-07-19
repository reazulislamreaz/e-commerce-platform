import type { ContactInternalEmail } from '../mail.types';
import { escapeHtml, renderEmailShell } from './email-shell';
import type { RenderedEmail } from './verification-email.template';

export function renderContactInternalEmail({
  name,
  email,
  subject,
  body,
  messageId,
}: ContactInternalEmail): RenderedEmail {
  return {
    subject: `[Contact] ${subject}`,
    text: [
      'New contact form submission',
      '',
      `Message ID: ${messageId}`,
      `Name: ${name}`,
      `Email: ${email}`,
      `Subject: ${subject}`,
      '',
      body,
    ].join('\n'),
    html: renderEmailShell({
      title: 'New contact message',
      preview: `Contact form: ${subject}`,
      bodyHtml: `<p style="margin:0 0 8px;"><strong style="color:#ffffff;">${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p>
        <p style="margin:0 0 16px;color:#e3bb78;">${escapeHtml(subject)}</p>
        <p style="margin:0;white-space:pre-wrap;color:#eee9e1;">${escapeHtml(body)}</p>
        <p style="margin:16px 0 0;font-size:11px;color:#8b867d;">Message ID: ${escapeHtml(messageId)}</p>`,
    }),
  };
}
