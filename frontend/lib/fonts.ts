import { Playfair_Display } from 'next/font/google';

// Editorial serif exposed as the `font-serif` utility (see globals.css).
export const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-playfair',
});
