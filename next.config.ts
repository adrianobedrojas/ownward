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
};

export default withNextIntl(nextConfig);
