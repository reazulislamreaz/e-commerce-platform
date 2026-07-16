/**
 * Customer contact widget configuration.
 * Override via environment variables in `.env.local`.
 */

const DEFAULT_WHATSAPP_NUMBER = '8801234567890';
const DEFAULT_WHATSAPP_MESSAGE =
  'Hi Elevate Apparel — I have a question about your products / my order.';
const DEFAULT_PHONE = '+8801571208486';
const DEFAULT_FACEBOOK_PAGE_ID = '61579074209186';

export interface ContactConfig {
  whatsappNumber: string;
  whatsappMessage: string;
  phoneNumber: string;
  facebookPageId: string;
}

export function getContactConfig(): ContactConfig {
  return {
    whatsappNumber:
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || DEFAULT_WHATSAPP_NUMBER,
    whatsappMessage:
      process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE?.trim() || DEFAULT_WHATSAPP_MESSAGE,
    phoneNumber: process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || DEFAULT_PHONE,
    facebookPageId:
      process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID?.trim() || DEFAULT_FACEBOOK_PAGE_ID,
  };
}

export function buildWhatsAppHref(number: string, message: string): string {
  const digits = number.replace(/\D/g, '');
  const params = new URLSearchParams({ text: message });
  return `https://wa.me/${digits}?${params.toString()}`;
}

export function buildTelHref(phone: string): string {
  const normalized = phone.replace(/[^\d+]/g, '');
  return `tel:${normalized}`;
}

export function buildMessengerHref(pageId: string): string {
  return `https://m.me/${pageId}`;
}

export function buildProductOrderWhatsAppHref(
  number: string,
  product: { name: string; slug: string; price: number },
  options: { size: string; color: string; quantity: number },
): string {
  const lineTotal = product.price * options.quantity;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';
  const productLink = siteUrl ? `${siteUrl}/product/${product.slug}` : `/product/${product.slug}`;
  const message = [
    'Hi Elevate Apparel, I would like to place an order:',
    '',
    `Product: ${product.name}`,
    `Color: ${options.color}`,
    `Size: ${options.size}`,
    `Quantity: ${options.quantity}`,
    `Unit price: ৳${product.price}`,
    `Line total: ৳${lineTotal}`,
    '',
    `Link: ${productLink}`,
  ].join('\n');

  return buildWhatsAppHref(number, message);
}
