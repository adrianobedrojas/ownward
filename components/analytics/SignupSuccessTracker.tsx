'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackGoogleAnalyticsConversion } from '@/lib/google-analytics';

const SIGNUP_TRACKED_KEY = 'ownward_signup_conversion_tracked_v1';

interface SignupSuccessTrackerProps {
  verifiedNonce: string | null;
}

export default function SignupSuccessTracker({ verifiedNonce }: SignupSuccessTrackerProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!verifiedNonce) {
      return;
    }

    const key = `${SIGNUP_TRACKED_KEY}:${verifiedNonce}`;
    try {
      if (window.localStorage.getItem(key) === '1') {
        return;
      }

      window.localStorage.setItem(key, '1');
    } catch {
      return;
    }

    trackGoogleAnalyticsConversion(
      'sign_up',
      {
        signup_method: 'email_password',
        destination: 'check_email',
      },
      { dedupeKey: `sign_up:${verifiedNonce}` },
    );

    const next = new URL(window.location.href);
    next.searchParams.delete('signup');
    next.searchParams.delete('nonce');
    window.history.replaceState({}, '', `${next.pathname}${next.search}`);
  }, [searchParams, verifiedNonce]);

  return null;
}
