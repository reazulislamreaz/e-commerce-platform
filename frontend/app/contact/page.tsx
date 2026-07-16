import type { Metadata } from 'next';
import ContactClient from './contact-client';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Contact Elevate Apparel — Dhaka studio, worldwide support.',
};

export default function ContactPage() {
  return <ContactClient />;
}
