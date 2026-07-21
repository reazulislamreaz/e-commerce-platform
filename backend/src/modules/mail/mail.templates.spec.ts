import { EmailJobName } from './mail.types';
import { renderAbandonedCartEmail } from './templates/abandoned-cart-email.template';
import { renderDeliveredEmail } from './templates/delivered-email.template';
import { renderOrderConfirmationEmail } from './templates/order-confirmation-email.template';
import { renderPasswordResetEmail } from './templates/password-reset-email.template';
import { renderPaymentConfirmationEmail } from './templates/payment-confirmation-email.template';
import { renderShippingUpdateEmail } from './templates/shipping-update-email.template';
import { renderReturnStatusEmail } from './templates/return-status-email.template';
import { renderWelcomeEmail } from './templates/welcome-email.template';
import { escapeHtml, renderEmailShell } from './templates/email-shell';

describe('transactional email templates', () => {
  it('escapes dynamic HTML in the shared shell', () => {
    const html = renderEmailShell({
      title: '<script>alert(1)</script>',
      preview: 'preview',
      greeting: 'Hi <em>test</em>,',
      bodyHtml: '<img src=x onerror=alert(1)>',
      cta: { label: 'Click', url: 'https://example.com?q=<bad>' },
      footer: 'Footer & note',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;em&gt;test&lt;/em&gt;');
    expect(html).toContain('&amp; note');
  });

  it.each([
    [
      'WELCOME',
      () => renderWelcomeEmail({ to: 'a@b.com', firstName: '<x>', shopUrl: 'https://shop.test' }),
    ],
    [
      'ORDER_CONFIRMATION',
      () =>
        renderOrderConfirmationEmail({
          to: 'a@b.com',
          firstName: '<x>',
          orderNumber: '=ORD-1',
          totalTaka: 100,
          trackUrl: 'https://shop.test/track',
        }),
    ],
    [
      'SHIPPING',
      () =>
        renderShippingUpdateEmail({
          to: 'a@b.com',
          firstName: '<x>',
          orderNumber: 'ORD-2',
          status: 'Shipped',
          trackingNumber: '+880',
          carrier: 'Courier',
          orderUrl: '/account/orders/1',
        }),
    ],
    [
      'DELIVERED',
      () =>
        renderDeliveredEmail({
          to: 'a@b.com',
          firstName: '<x>',
          orderNumber: 'ORD-3',
          orderUrl: '/account/orders/1',
        }),
    ],
    [
      'PAYMENT',
      () =>
        renderPaymentConfirmationEmail({
          to: 'a@b.com',
          firstName: '<x>',
          orderNumber: 'ORD-4',
          totalTaka: 2500,
          paymentMethod: 'COD',
          orderUrl: '/account/orders/1',
        }),
    ],
    [
      'RETURN_STATUS',
      () =>
        renderReturnStatusEmail({
          to: 'a@b.com',
          firstName: '<x>',
          orderNumber: 'ORD-5',
          requestType: 'exchange',
          status: 'approved',
          requestUrl: '/account/exchanges',
          note: '<script>unsafe</script>',
        }),
    ],
    [
      'PASSWORD_RESET',
      () =>
        renderPasswordResetEmail({
          to: 'a@b.com',
          firstName: '<x>',
          resetUrl: 'https://shop.test/reset?token=abc',
        }),
    ],
    [
      'ABANDONED_CART',
      () =>
        renderAbandonedCartEmail({
          to: 'a@b.com',
          firstName: '<x>',
          cartUrl: 'https://shop.test/cart',
          items: [{ name: '<tee>', quantity: 1 }],
        }),
    ],
  ])('renders %s through email-shell without raw HTML injection', (_label, render) => {
    const rendered = render();
    expect(rendered.html).toContain('alt="Elevate Apparel"');
    expect(rendered.html).toContain('elevate-apparel-logo-on-dark.png');
    expect(rendered.html).not.toContain('<x>');
    expect(rendered.html).toContain(escapeHtml('<x>'));
  });

  it('covers mail processor job names for commerce emails', () => {
    const commerceJobs = [
      EmailJobName.WELCOME,
      EmailJobName.ORDER_CONFIRMATION,
      EmailJobName.SHIPPING_UPDATE,
      EmailJobName.DELIVERED,
      EmailJobName.PAYMENT_CONFIRMATION,
      EmailJobName.RETURN_STATUS,
      EmailJobName.PASSWORD_RESET,
      EmailJobName.ABANDONED_CART,
    ];
    expect(commerceJobs.every((name) => typeof name === 'string')).toBe(true);
  });
});
