'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { usePrivacyConsent } from '@/components/PrivacyConsent';
import { GoogleAnalyticsController } from '@/lib/google-analytics';

export default function GoogleAnalytics() {
  const { consent } = usePrivacyConsent();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const previousUrlRef = useRef<string>('');

  const controller = useMemo(
    () => new GoogleAnalyticsController(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
    [],
  );

  useEffect(() => {
    controller.setConsent({
      analytics: Boolean(consent?.analytics),
      functionality: Boolean(consent?.functionality),
    });

    if (!consent?.analytics) {
      previousUrlRef.current = '';
    }
  }, [controller, consent?.analytics, consent?.functionality]);

  useEffect(() => {
    if (!consent?.analytics) {
      return;
    }

    const currentUrl = window.location.href;
    const referrer = previousUrlRef.current || window.document.referrer;

    controller.trackPageView(currentUrl, referrer);
    previousUrlRef.current = currentUrl;
  }, [controller, consent?.analytics, pathname, search]);

  return null;
}
