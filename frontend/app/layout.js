import { Fraunces, Public_Sans } from 'next/font/google';
import './globals.css';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

// The U.S. federal government's own typeface — used on National Park
// Service signage. A deliberate pairing for a "trail" brand, not a
// default sans swapped in for its own sake.
const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-public-sans',
  display: 'swap',
});

export const metadata = {
  title: 'TrailNest — quiet stays, off the beaten path',
  description:
    'A small collection of cabins, cottages, and farmstays. Browse listings and reach out directly to the people who host them.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable}`}>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
