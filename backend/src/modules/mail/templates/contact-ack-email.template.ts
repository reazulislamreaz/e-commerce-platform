import type { ContactAckEmail } from '../mail.types';
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
                <h1 style="margin:0;font-size:22px;line-height:1.3;color:#ffffff;">Message received</h1>
                <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#b5b0a8;">${greeting}</p>
                <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#b5b0a8;">
                  Thanks for contacting Elevate Apparel about
                  <strong style="color:#ffffff;">${subject}</strong>.
                  Our team will review your message and respond as soon as possible.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-size:11px;color:#8b867d;">&copy; Elevate Apparel — Dhaka, Worldwide</p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}
