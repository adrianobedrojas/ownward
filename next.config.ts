import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { getAllowedDevOrigins } from './lib/config';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const allowedOrigins = getAllowedDevOrigins();

const nextConfig: NextConfig = {
  allowedDevOrigins: allowedOrigins,
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
  async redirects() {
    return [
      {
        source: '/value-my-business',
        destination: '/valuation',
        permanent: true,
      },
      {
        source: '/es/value-my-business',
        destination: '/es/valuation',
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
