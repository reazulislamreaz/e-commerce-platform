import type { VerificationEmail } from '../mail.types';

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

/** Brand-themed (dark + champagne gold) verification email. */
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
                <h1 style="margin:0;font-size:22px;line-height:1.3;color:#ffffff;">Verify your email address</h1>
                <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#b5b0a8;">${greeting}</p>
                <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#b5b0a8;">
                  Welcome to Elevate Apparel. Click the button below to confirm your email address and activate your account.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;text-align:center;">
                <a href="${verifyUrl}"
                   style="display:inline-block;background-color:#e5bd79;color:#18120b;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:4px;">
                  Verify Email
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#8b867d;">
                  This link expires in 24 hours. If the button does not work, copy and paste this URL into your browser:
                </p>
                <p style="margin:8px 0 0;font-size:12px;line-height:1.6;word-break:break-all;">
                  <a href="${verifyUrl}" style="color:#e3bb78;text-decoration:underline;">${verifyUrl}</a>
                </p>
                <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#8b867d;">
                  If you did not create an account, you can safely ignore this email.
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
