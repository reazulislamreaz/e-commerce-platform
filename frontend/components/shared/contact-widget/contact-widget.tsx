'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import {
  buildMessengerHref,
  buildTelHref,
  buildWhatsAppHref,
  getContactConfig,
} from '@/lib/contact-config';
import { MessengerIcon, PhoneIcon, WhatsAppIcon } from './icons';
import { openMessengerCustomerChat } from './messenger';

type ChannelId = 'messenger' | 'whatsapp' | 'phone';

interface ContactChannel {
  id: ChannelId;
  label: string;
  actionLabel: string;
  href?: string;
  external?: boolean;
  icon: typeof WhatsAppIcon;
  iconClassName: string;
  tileClassName: string;
}

const POSITION =
  'fixed z-50 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] md:bottom-[max(1.25rem,env(safe-area-inset-bottom))] md:right-[max(1.25rem,env(safe-area-inset-right))] lg:bottom-[max(1.5rem,env(safe-area-inset-bottom))] lg:right-[max(1.5rem,env(safe-area-inset-right))]';

export function ContactWidget() {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [messengerLoading, setMessengerLoading] = useState(false);

  const config = getContactConfig();
  const whatsappHref = buildWhatsAppHref(config.whatsappNumber, config.whatsappMessage);
  const telHref = buildTelHref(config.phoneNumber);
  const messengerFallbackHref = config.facebookPageId
    ? buildMessengerHref(config.facebookPageId)
    : undefined;

  const channels: ContactChannel[] = [
    ...(config.facebookPageId
      ? [
          {
            id: 'messenger' as const,
            label: 'Messenger',
            actionLabel: 'Chat now',
            href: messengerFallbackHref,
            external: true,
            icon: MessengerIcon,
            iconClassName: 'text-[#0084FF]',
            tileClassName: 'bg-white',
          },
        ]
      : []),
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      actionLabel: 'Message us',
      href: whatsappHref,
      external: true,
      icon: WhatsAppIcon,
      iconClassName: 'text-[#25D366]',
      tileClassName: 'bg-white',
    },
    {
      id: 'phone',
      label: 'Call',
      actionLabel: 'Call now',
      href: telHref,
      icon: PhoneIcon,
      iconClassName: 'text-[#C9A227]',
      tileClassName: 'bg-white',
    },
  ];

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [open, close]);

  const handleMessenger = async () => {
    if (!config.facebookPageId) return;
    setMessengerLoading(true);
    close();
    try {
      await openMessengerCustomerChat(config.facebookPageId);
    } catch {
      if (messengerFallbackHref) {
        window.open(messengerFallbackHref, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setMessengerLoading(false);
    }
  };

  const handleChannelClick = async (channel: ContactChannel) => {
    if (channel.id === 'messenger') {
      await handleMessenger();
      return;
    }
    close();
  };

  return (
    <div ref={rootRef} className={`${POSITION} flex flex-col items-end gap-2.5`}>
      <div
        id={menuId}
        role="menu"
        aria-label="Contact options"
        aria-hidden={!open}
        className={`flex flex-col items-end gap-2.5 transition-all duration-300 ease-out ${
          open
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        {channels.map((channel, index) => {
          const Icon = channel.icon;
          const delayMs = (channels.length - 1 - index) * 45;
          const content = (
            <>
              <span
                className={`pointer-events-none absolute right-[calc(100%+0.65rem)] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-[4px] border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[.08em] text-[#555555] shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block ${
                  open ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {channel.label}
                <span className="ml-1.5 font-normal normal-case tracking-normal text-[#555555]">
                  · {channel.actionLabel}
                </span>
              </span>
              <span
                className={`flex size-11 items-center justify-center rounded-[4px] border border-[#E5E7EB] shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-[transform,box-shadow,border-color] duration-200 ease-out group-hover:scale-[1.03] group-hover:border-[#E5E7EB] group-focus-visible:scale-[1.03] group-focus-visible:border-[#C9A227] group-active:scale-[0.98] sm:size-12 ${channel.tileClassName}`}
              >
                <Icon className={`size-5 sm:size-[22px] ${channel.iconClassName}`} />
              </span>
              <span className="sr-only">
                {channel.label} — {channel.actionLabel}
              </span>
            </>
          );

          const style = {
            transitionDelay: open ? `${delayMs}ms` : '0ms',
          };

          if (channel.id === 'messenger') {
            return (
              <button
                key={channel.id}
                type="button"
                role="menuitem"
                style={style}
                disabled={messengerLoading}
                aria-label={`${channel.label} — ${channel.actionLabel}`}
                onClick={() => void handleChannelClick(channel)}
                className="group relative outline-none disabled:opacity-60"
              >
                {content}
              </button>
            );
          }

          return (
            <a
              key={channel.id}
              role="menuitem"
              style={style}
              href={channel.href}
              {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              aria-label={`${channel.label} — ${channel.actionLabel}`}
              onClick={() => handleChannelClick(channel)}
              className="group relative outline-none"
            >
              {content}
            </a>
          );
        })}
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? 'Close contact menu' : 'Open contact menu'}
        onClick={() => setOpen((value) => !value)}
        className="flex size-12 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#C9A227] shadow-[0_4px_18px_rgba(0,0,0,0.45)] outline-none transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out hover:border-[#C9A227]/60 hover:bg-white hover:shadow-[0_6px_22px_rgba(0,0,0,0.5)] focus-visible:ring-2 focus-visible:ring-[#C9A227] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAFA] active:scale-95 sm:size-[52px]"
      >
        <span
          className={`absolute transition-all duration-200 ease-out ${
            open ? 'rotate-90 scale-75 opacity-0' : 'rotate-0 scale-100 opacity-100'
          }`}
          aria-hidden="true"
        >
          <MessageCircle className="size-5 sm:size-[22px]" strokeWidth={1.7} />
        </span>
        <span
          className={`absolute transition-all duration-200 ease-out ${
            open ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-75 opacity-0'
          }`}
          aria-hidden="true"
        >
          <X className="size-5 sm:size-[22px]" strokeWidth={1.7} />
        </span>
      </button>
    </div>
  );
}
