import type { Metadata } from 'next';
import './globals.css';
import { SITE_NAME, getSiteOrigin } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: 'Run, grow, buy, and sell small businesses in one connected platform.',
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
