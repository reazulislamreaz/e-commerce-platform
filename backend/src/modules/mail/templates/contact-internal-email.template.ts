import type { ContactInternalEmail } from '../mail.types';
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
    html: `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#0a0a0b;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0b;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#111110;border:1px solid #2d2a27;border-radius:6px;">
            <tr>
              <td style="padding:28px 32px 0;text-align:center;">
                <p style="margin:0;font-size:11px;font-weight:bold;letter-spacing:3px;color:#e0bd7d;">ELEVATE APPAREL</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;color:#ffffff;">New contact message</h1>
                <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#b5b0a8;">
                  <strong style="color:#ffffff;">${name}</strong> &lt;${email}&gt;
                </p>
                <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#e3bb78;">${subject}</p>
                <p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#eee9e1;white-space:pre-wrap;">${escapeHtml(body)}</p>
                <p style="margin:16px 0 0;font-size:11px;line-height:1.6;color:#8b867d;">Message ID: ${messageId}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
