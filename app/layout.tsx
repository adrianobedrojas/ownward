import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Ownward',
    template: '%s | Ownward',
  },
  description: 'Run, grow, buy, and sell small businesses in one connected platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
