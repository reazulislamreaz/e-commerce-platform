import type { VerificationEmail } from '../mail.types';
import { renderEmailShell } from './email-shell';

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function renderVerificationEmail({ firstName, verifyUrl }: VerificationEmail): RenderedEmail {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  return {
    subject: 'Verify your email — Elevate Apparel',
    text: [
      greeting,
      '',
      'Welcome to Elevate Apparel. Confirm your email address to activate your account:',
      verifyUrl,
      '',
      'This link expires in 24 hours. If you did not create an account, you can safely ignore this email.',
    ].join('\n'),
    html: renderEmailShell({
      title: 'Verify your email address',
      preview: 'Confirm your email to activate your Elevate Apparel account.',
      greeting,
      bodyHtml:
        'Welcome to Elevate Apparel. Click the button below to confirm your email address and activate your account.',
      cta: { label: 'Verify Email', url: verifyUrl },
      footer:
        'This link expires in 24 hours. If you did not create an account, you can safely ignore this email.',
    }),
  };
}
