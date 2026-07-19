import type { WelcomeEmail } from '../mail.types';
import { escapeHtml, renderEmailShell } from './email-shell';
import type { RenderedEmail } from './verification-email.template';

export function renderWelcomeEmail(email: WelcomeEmail): RenderedEmail {
  const greeting = email.firstName ? `Hi ${email.firstName},` : 'Hi,';
  return {
    subject: 'Welcome to Elevate Apparel',
    text: `${greeting}\n\nYour email is verified and your account is ready. Discover premium everyday essentials at ${email.shopUrl}`,
    html: renderEmailShell({
      title: 'Welcome to Elevate',
      preview: 'Your Elevate Apparel account is ready.',
      greeting,
      bodyHtml:
        'Your email is verified and your account is ready. Explore premium essentials designed to elevate your everyday style.',
      cta: { label: 'Start Shopping', url: email.shopUrl },
      footer: `This message was sent to ${escapeHtml(email.to)} after account verification.`,
    }),
  };
}
