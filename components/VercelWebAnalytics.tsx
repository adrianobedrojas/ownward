'use client';

import { Analytics } from '@vercel/analytics/next';
import { usePrivacyConsent } from '@/components/PrivacyConsent';
import { createBeforeSend } from '@/lib/vercel-analytics';

const beforeSend = createBeforeSend();

export default function VercelWebAnalytics() {
  const { consent } = usePrivacyConsent();

  if (!consent?.analytics) {
    return null;
  }

  return <Analytics beforeSend={beforeSend} />;
}
