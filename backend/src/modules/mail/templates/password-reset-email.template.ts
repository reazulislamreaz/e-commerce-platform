import type { PasswordResetEmail } from '../mail.types';
import { renderEmailShell } from './email-shell';
import type { RenderedEmail } from './verification-email.template';

export function renderPasswordResetEmail(email: PasswordResetEmail): RenderedEmail {
  const greeting = email.firstName ? `Hi ${email.firstName},` : 'Hi,';
  return {
    subject: 'Reset your password — Elevate Apparel',
    text: [
      greeting,
      '',
      'We received a request to reset the password for your Elevate Apparel account. Use the link below to choose a new password:',
      email.resetUrl,
      '',
      'This link expires in 30 minutes and can be used once. If you did not request a password reset, you can safely ignore this email — your password will not change.',
    ].join('\n'),
    html: renderEmailShell({
      title: 'Reset your password',
      preview: 'Choose a new password for your Elevate Apparel account.',
      greeting,
      bodyHtml:
        'We received a request to reset the password for your account. Click the button below to choose a new password.',
      cta: { label: 'Reset Password', url: email.resetUrl },
      footer:
        'This link expires in 30 minutes and can be used once. If you did not request a password reset, you can safely ignore this email — your password will not change.',
    }),
  };
}
