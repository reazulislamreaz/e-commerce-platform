import { buildWhatsAppHref, getContactConfig } from '@/lib/contact-config';

export type SocialPlatform = 'facebook' | 'whatsapp' | 'instagram' | 'youtube' | 'tiktok';

export type SocialLink = {
  id: SocialPlatform;
  label: string;
  href: string;
};

/** Storefront social profiles — prioritized for Bangladesh audiences. */
export function getSocialLinks(): SocialLink[] {
  const config = getContactConfig();

  const links: SocialLink[] = [
    {
      id: 'facebook',
      label: 'Facebook',
      href: config.facebookPageId ? `https://www.facebook.com/${config.facebookPageId}` : '',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      href: buildWhatsAppHref(config.whatsappNumber, config.whatsappMessage),
    },
    {
      id: 'instagram',
      label: 'Instagram',
      href:
        process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || 'https://www.instagram.com/elevateapparel',
    },
    {
      id: 'youtube',
      label: 'YouTube',
      href:
        process.env.NEXT_PUBLIC_YOUTUBE_URL?.trim() || 'https://www.youtube.com/@elevateapparel',
    },
    {
      id: 'tiktok',
      label: 'TikTok',
      href: process.env.NEXT_PUBLIC_TIKTOK_URL?.trim() || 'https://www.tiktok.com/@elevateapparel',
    },
  ];

  return links.filter((link) => link.href.length > 0);
}
