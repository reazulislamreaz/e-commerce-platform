import type { PasswordResetEmail } from '../mail.types';
import type { RenderedEmail } from './verification-email.template';

/** Brand-themed (dark + champagne gold) password reset email. */
export function renderPasswordResetEmail({
  firstName,
  resetUrl,
}: PasswordResetEmail): RenderedEmail {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  return {
    subject: 'Reset your password — Elevate Apparel',
    text: [
      greeting,
      '',
      'We received a request to reset the password for your Elevate Apparel account. Use the link below to choose a new password:',
      resetUrl,
      '',
      'This link expires in 30 minutes and can be used once. If you did not request a password reset, you can safely ignore this email — your password will not change.',
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
              <td style="padding:20px 32px 0;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;color:#ffffff;">Reset your password</h1>
                <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#b5b0a8;">${greeting}</p>
                <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#b5b0a8;">
                  We received a request to reset the password for your account. Click the button below to choose a new password.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;text-align:center;">
                <a href="${resetUrl}"
                   style="display:inline-block;background-color:#e5bd79;color:#18120b;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:4px;">
                  Reset Password
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#8b867d;">
                  This link expires in 30 minutes and can be used once. If the button does not work, copy and paste this URL into your browser:
                </p>
                <p style="margin:8px 0 0;font-size:12px;line-height:1.6;word-break:break-all;">
                  <a href="${resetUrl}" style="color:#e3bb78;text-decoration:underline;">${resetUrl}</a>
                </p>
                <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#8b867d;">
                  If you did not request a password reset, you can safely ignore this email — your password will not change.
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
