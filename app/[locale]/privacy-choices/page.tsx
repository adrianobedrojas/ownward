import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createMetadata } from '@/lib/seo';
import { OpenPrivacyChoicesButton } from '@/components/PrivacyConsent';
import { PRIVACY_CONSENT_STORAGE_KEY } from '@/lib/privacy-consent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return createMetadata({ locale, pathname: '/privacy-choices', title: t('privacyChoices.title'), description: t('privacyChoices.description') });
}

export default async function PrivacyChoicesPage() {
  const locale = await getLocale();
  const isSpanish = locale === 'es';

  const copy = isSpanish
    ? {
        badge: 'Opciones de privacidad',
        title: 'Controla cookies y almacenamiento local opcional',
        description: 'Ownward guarda tus elecciones de privacidad en este navegador con la clave',
        necessaryTitle: 'Necesario (siempre activo)',
        necessaryBody:
          'Incluye cookies de sesión/autenticación de Supabase, protecciones de seguridad y el almacenamiento mínimo para ejecutar funciones solicitadas. NEXT_LOCALE guarda preferencia de idioma (~1 año).',
        functionalityTitle: 'Funcionalidad (opcional)',
        functionalityBody:
          'Si está activado, Ownward puede guardar progreso local en ownward_academy_progress_v1, ownward_start_business_plan_v1 y ownward_visitor_token. Estos datos quedan en localStorage hasta que los borres, cambies consentimiento o limpies el navegador.',
        analyticsTitle: 'Analítica (opcional)',
        analyticsBody:
          'Activa Vercel Web Analytics y Google Analytics 4 solo después de consentimiento. Ownward elimina fragmentos, conserva solo parámetros UTM/campaña permitidos, redacciona IDs/tokens privados conocidos y mantiene desactivado el almacenamiento/publicidad personalizada.',
        footer:
          'Las cookies y localStorage no son iguales: las cookies pueden caducar automáticamente, mientras que localStorage normalmente permanece hasta borrado o revocación de consentimiento.',
        googlePolicy: 'Cómo Google usa información de sitios o apps que usan sus servicios',
        privacy: 'Política de privacidad',
        terms: 'Términos del servicio',
        pricing: 'Precios',
      }
    : {
        badge: 'Privacy choices',
        title: 'Control optional cookies and local storage',
        description: 'Ownward stores your privacy choices in this browser under the key',
        necessaryTitle: 'Necessary (always on)',
        necessaryBody:
          'Includes Supabase authentication/session cookies, security controls, and the minimum storage required to run requested features. NEXT_LOCALE stores language preference (~1 year).',
        functionalityTitle: 'Functionality (optional)',
        functionalityBody:
          'If enabled, Ownward may save local progress in ownward_academy_progress_v1, ownward_start_business_plan_v1, and ownward_visitor_token. This localStorage data remains until cleared, consent changes, or browser storage is removed.',
        analyticsTitle: 'Analytics (optional)',
        analyticsBody:
          'Enables Vercel Web Analytics and Google Analytics 4 only after consent. Ownward removes fragments, keeps only allowed campaign/UTM parameters, redacts known private IDs/tokens, and keeps advertising/personalization storage disabled.',
        footer:
          'Cookies and localStorage behave differently: cookies may expire automatically, while localStorage usually remains until cleared or consent is revoked.',
        googlePolicy: 'How Google uses information from sites or apps that use its services',
        privacy: 'Privacy Policy',
        terms: 'Terms of Service',
        pricing: 'Pricing',
      };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-4xl items-center px-4 py-12 sm:px-6">
      <section className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{copy.badge}</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{copy.title}</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-300">{copy.description} <code className="rounded bg-slate-950 px-2 py-1 text-sm text-cyan-300">{PRIVACY_CONSENT_STORAGE_KEY}</code>.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-800 bg-slate-950/80 p-4"><h2 className="font-semibold text-white">{copy.necessaryTitle}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{copy.necessaryBody}</p></article>
          <article className="rounded-xl border border-slate-800 bg-slate-950/80 p-4"><h2 className="font-semibold text-white">{copy.functionalityTitle}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{copy.functionalityBody}</p></article>
          <article className="rounded-xl border border-slate-800 bg-slate-950/80 p-4"><h2 className="font-semibold text-white">{copy.analyticsTitle}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{copy.analyticsBody}</p></article>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <OpenPrivacyChoicesButton className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">{isSpanish ? 'Abrir panel de privacidad' : 'Open privacy panel'}</OpenPrivacyChoicesButton>
          <Link href="/privacy" className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200">{copy.privacy}</Link>
          <Link href="/terms" className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200">{copy.terms}</Link>
          <Link href="/pricing" className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200">{copy.pricing}</Link>
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer noopener" className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200">{copy.googlePolicy}</a>
          <Link href="mailto:ownwardhub@gmail.com" className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200">ownwardhub@gmail.com</Link>
        </div>
        <p className="mt-6 text-sm leading-6 text-slate-400">{copy.footer}</p>
      </section>
    </main>
  );
}
