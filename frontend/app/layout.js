import { Fraunces, Karla } from 'next/font/google';
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

const karla = Karla({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-karla',
  display: 'swap',
});

export const metadata = {
  title: 'TrailNest — quiet stays, off the beaten path',
  description:
    'A small collection of cabins, cottages, and farmstays. Browse listings and reach out directly to the people who host them.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${karla.variable}`}>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
