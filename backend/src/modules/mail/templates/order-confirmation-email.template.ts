import type { OrderConfirmationEmail } from '../mail.types';
import type { RenderedEmail } from './verification-email.template';

export function renderOrderConfirmationEmail({
  firstName,
  orderNumber,
  totalTaka,
  trackUrl,
}: OrderConfirmationEmail): RenderedEmail {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  return {
    subject: `Order confirmed — ${orderNumber}`,
    text: [
      greeting,
      '',
      `Thanks for shopping with Elevate Apparel. Your order ${orderNumber} is confirmed.`,
      `Order total: BDT ${totalTaka.toLocaleString('en-BD')}`,
      '',
      'Track your order:',
      trackUrl,
    ].join('\n'),
    html: brandShell({
      title: 'Order confirmed',
      greeting,
      body: `Thanks for shopping with Elevate Apparel. Your order <strong style="color:#ffffff;">${orderNumber}</strong> is confirmed.<br/><br/>Order total: <strong style="color:#e3bb78;">BDT ${totalTaka.toLocaleString('en-BD')}</strong>`,
      ctaLabel: 'Track Order',
      ctaUrl: trackUrl,
      footer: 'We will notify you when your order ships.',
    }),
  };
}

function brandShell(input: {
  title: string;
  greeting: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footer: string;
}): string {
  return `<!doctype html>
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
              <td style="padding:20px 32px 0;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;color:#ffffff;">${input.title}</h1>
                <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#b5b0a8;">${input.greeting}</p>
                <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#b5b0a8;">${input.body}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;text-align:center;">
                <a href="${input.ctaUrl}"
                   style="display:inline-block;background-color:#e5bd79;color:#18120b;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:4px;">
                  ${input.ctaLabel}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#8b867d;">${input.footer}</p>
                <p style="margin:8px 0 0;font-size:12px;line-height:1.6;word-break:break-all;">
                  <a href="${input.ctaUrl}" style="color:#e3bb78;text-decoration:underline;">${input.ctaUrl}</a>
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-size:11px;color:#8b867d;">&copy; Elevate Apparel — Dhaka, Worldwide</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
