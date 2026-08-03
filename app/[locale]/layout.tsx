import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { PrivacyConsentProvider } from '@/components/PrivacyConsent';
import VercelWebAnalytics from '@/components/VercelWebAnalytics';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { routing } from '@/i18n/routing';
import { buildConsentInitScript } from '@/lib/google-analytics';
import { LEGACY_PRIVACY_CONSENT_STORAGE_KEY, PRIVACY_CONSENT_STORAGE_KEY } from '@/lib/privacy-consent';

// Built once at module initialisation – the keys are compile-time constants.
const consentInitScript = buildConsentInitScript(
  PRIVACY_CONSENT_STORAGE_KEY,
  LEGACY_PRIVACY_CONSENT_STORAGE_KEY,
);

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'en' | 'es')) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      {/* Consent-mode initialisation must run before any gtag/GTM script loads
          so Google Tag Assistant registers a proper 'Consent Initialization'
          event.  The script sets all privacy-sensitive signals to 'denied' by
          default, then immediately restores a previously saved choice from
          localStorage so returning visitors are not forced to re-consent. */}
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: consentInitScript }} />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <NextIntlClientProvider messages={messages}>
          <PrivacyConsentProvider>
            <Navbar />
            <main>{children}</main>
            <Footer />
            <VercelWebAnalytics />
            <GoogleAnalytics />
          </PrivacyConsentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
