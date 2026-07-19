import type { NewsletterWelcomeEmail } from '../mail.types';
import { renderEmailShell } from './email-shell';
import type { RenderedEmail } from './verification-email.template';

export function renderNewsletterWelcomeEmail({ unsubscribeUrl }: NewsletterWelcomeEmail): RenderedEmail {
  return {
    subject: 'Welcome to Elevate Apparel updates',
    text: [
      'Thanks for subscribing to Elevate Apparel.',
      '',
      'You will receive new arrivals, drops, and exclusive offers.',
      '',
      'Unsubscribe anytime:',
      unsubscribeUrl,
    ].join('\n'),
    html: renderEmailShell({
      title: 'You are subscribed',
      preview: 'Thanks for joining Elevate Apparel updates.',
      bodyHtml:
        'Thanks for joining Elevate Apparel updates. Expect new arrivals, drops, and exclusive offers.',
      cta: { label: 'Unsubscribe', url: unsubscribeUrl },
    }),
  };
}
