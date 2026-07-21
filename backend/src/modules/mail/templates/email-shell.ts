export type EmailShellInput = {
  title: string;
  preview: string;
  greeting?: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footer?: string;
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderEmailShell(input: EmailShellInput): string {
  const title = escapeHtml(input.title);
  const preview = escapeHtml(input.preview);
  const greeting = input.greeting ? escapeHtml(input.greeting) : '';
  const siteOrigin = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
  const logoUrl = `${siteOrigin}/images/brand/elevate-apparel-logo-on-dark.png`;
  const cta = input.cta
    ? `<tr><td style="padding:28px 24px;text-align:center;"><a href="${escapeHtml(input.cta.url)}" style="display:inline-block;background:#111111;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 30px;border-radius:4px;">${escapeHtml(input.cta.label)}</a></td></tr>`
    : '';
  const fallbackUrl = input.cta
    ? `<p style="margin:16px 0 0;font-size:11px;line-height:1.6;word-break:break-all;color:#8b867d;">If the button does not work, copy this link:<br/><a href="${escapeHtml(input.cta.url)}" style="color:#C9A227;">${escapeHtml(input.cta.url)}</a></p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0b;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111110;border:1px solid #2d2a27;border-radius:6px;">
        <tr><td style="padding:26px 24px 0;text-align:center;">
          <img src="${escapeHtml(logoUrl)}" alt="Elevate Apparel" width="200" height="29" style="display:inline-block;width:200px;height:auto;border:0;outline:none;text-decoration:none;" />
        </td></tr>
        <tr><td style="padding:20px 24px 0;">
          <h1 style="margin:0;font-size:24px;line-height:1.25;color:#fff;">${title}</h1>
          ${greeting ? `<p style="margin:18px 0 0;font-size:14px;line-height:1.65;color:#eee9e1;">${greeting}</p>` : ''}
          <div style="margin:10px 0 0;font-size:14px;line-height:1.65;color:#b5b0a8;">${input.bodyHtml}</div>
        </td></tr>
        ${cta}
        <tr><td style="padding:0 24px 26px;">
          ${input.footer ? `<p style="margin:0;font-size:12px;line-height:1.6;color:#8b867d;">${escapeHtml(input.footer)}</p>` : ''}
          ${fallbackUrl}
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:11px;color:#8b867d;">&copy; Elevate Apparel — Dhaka, Bangladesh</p>
    </td></tr>
  </table>
</body>
</html>`;
}
