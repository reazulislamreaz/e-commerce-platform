import type { OrderConfirmationEmail } from '../mail.types';
import { escapeHtml, renderEmailShell } from './email-shell';
import type { RenderedEmail } from './verification-email.template';

export function renderOrderConfirmationEmail(email: OrderConfirmationEmail): RenderedEmail {
  const greeting = email.firstName ? `Hi ${email.firstName},` : 'Hi,';
  const total = `BDT ${email.totalTaka.toLocaleString('en-BD')}`;
  const items = email.items ?? [];
  const itemRows =
    items.length > 0
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;border-collapse:collapse;">
          ${items
            .map(
              (item) => `<tr>
                <td style="padding:8px 0;border-bottom:1px solid #2d2a27;color:#eee9e1;font-size:13px;">
                  ${escapeHtml(item.name)}
                  <span style="display:block;color:#8b867d;font-size:12px;">${escapeHtml(item.color)} / ${escapeHtml(item.size)} × ${item.quantity}</span>
                </td>
                <td style="padding:8px 0;border-bottom:1px solid #2d2a27;color:#e3bb78;font-size:13px;text-align:right;white-space:nowrap;">
                  BDT ${(item.unitPriceTaka * item.quantity).toLocaleString('en-BD')}
                </td>
              </tr>`,
            )
            .join('')}
        </table>`
      : '';
  const totals =
    email.subtotalTaka != null
      ? `<p style="margin:14px 0 0;font-size:13px;color:#b5b0a8;">
          Subtotal: BDT ${email.subtotalTaka.toLocaleString('en-BD')}<br/>
          Shipping: BDT ${(email.shippingTaka ?? 0).toLocaleString('en-BD')}<br/>
          ${email.discountTaka ? `Discount: −BDT ${email.discountTaka.toLocaleString('en-BD')}<br/>` : ''}
          <strong style="color:#e3bb78;">Total: ${escapeHtml(total)}</strong>
        </p>`
      : `<p style="margin:14px 0 0;font-size:14px;color:#b5b0a8;">Order total: <strong style="color:#e3bb78;">${escapeHtml(total)}</strong></p>`;

  return {
    subject: `Order confirmed — ${email.orderNumber}`,
    text: [
      greeting,
      '',
      `Thanks for shopping with Elevate Apparel. Your order ${email.orderNumber} is confirmed.`,
      `Order total: ${total}`,
      '',
      'Track your order:',
      email.trackUrl,
    ].join('\n'),
    html: renderEmailShell({
      title: 'Order confirmed',
      preview: `Order ${email.orderNumber} is confirmed.`,
      greeting,
      bodyHtml: `Thanks for shopping with Elevate Apparel. Your order <strong style="color:#ffffff;">${escapeHtml(email.orderNumber)}</strong> is confirmed.${itemRows}${totals}`,
      cta: { label: 'Track Order', url: email.trackUrl },
      footer: 'We will notify you when your order ships.',
    }),
  };
}
