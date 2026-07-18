import type { OrderStatusEmail } from '../mail.types';
import type { RenderedEmail } from './verification-email.template';

export function renderOrderStatusEmail({
  firstName,
  orderNumber,
  status,
  trackingNumber,
  orderUrl,
}: OrderStatusEmail): RenderedEmail {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const trackingLine = trackingNumber
    ? `<br/><br/>Tracking number: <strong style="color:#ffffff;">${trackingNumber}</strong>`
    : '';

  return {
    subject: `Order update — ${orderNumber}`,
    text: [
      greeting,
      '',
      `Your order ${orderNumber} is now ${status}.`,
      trackingNumber ? `Tracking number: ${trackingNumber}` : '',
      '',
      'View your order:',
      orderUrl,
    ]
      .filter(Boolean)
      .join('\n'),
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
              <td style="padding:20px 32px 0;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;color:#ffffff;">Order update</h1>
                <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#b5b0a8;">${greeting}</p>
                <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#b5b0a8;">
                  Your order <strong style="color:#ffffff;">${orderNumber}</strong> is now
                  <strong style="color:#e3bb78;">${status}</strong>.${trackingLine}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;text-align:center;">
                <a href="${orderUrl}"
                   style="display:inline-block;background-color:#e5bd79;color:#18120b;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:4px;">
                  View Order
                </a>
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
