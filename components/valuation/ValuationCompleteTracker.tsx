'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackGoogleAnalyticsConversion } from '@/lib/google-analytics';

interface ValuationCompleteTrackerProps {
  reportLevel: string;
  verifiedNonce: string | null;
}

export default function ValuationCompleteTracker({
  reportLevel,
  verifiedNonce,
}: ValuationCompleteTrackerProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!verifiedNonce) {
      return;
    }

    const localKey = `ownward_valuation_complete_tracked_v1:${verifiedNonce}`;
    try {
      if (window.localStorage.getItem(localKey) === '1') {
        return;
      }
      window.localStorage.setItem(localKey, '1');
    } catch {
      return;
    }

    trackGoogleAnalyticsConversion(
      'valuation_complete',
      {
        report_level: reportLevel,
      },
      { dedupeKey: `valuation_complete:${verifiedNonce}` },
    );

    const next = new URL(window.location.href);
    next.searchParams.delete('valuation');
    next.searchParams.delete('nonce');
    window.history.replaceState({}, '', `${next.pathname}${next.search}`);
  }, [reportLevel, searchParams, verifiedNonce]);

  return null;
}
