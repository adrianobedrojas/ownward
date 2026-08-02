import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { OpenPrivacyChoicesButton } from '@/components/PrivacyConsent';
import { LEGAL_OPERATOR, PRIVACY_CONTENT } from '@/lib/legal-content';
import {
  CURRENT_PRIVACY_VERSION,
  POLICY_EFFECTIVE_DATE,
  POLICY_LAST_UPDATED_DATE,
} from '@/lib/policies';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('privacy.title'), description: t('privacy.description') };
}

export default async function PrivacyPolicyPage() {
  const locale = await getLocale();
  const isSpanish = locale === 'es';
  const content = PRIVACY_CONTENT[isSpanish ? 'es' : 'en'];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{content.badge}</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{content.title}</h1>
        <p className="mt-4 text-sm text-slate-300"><span className="font-semibold text-white">{isSpanish ? 'Vigente:' : 'Effective:'}</span> {POLICY_EFFECTIVE_DATE}<span className="mx-2 text-slate-500">•</span><span className="font-semibold text-white">{isSpanish ? 'Actualizado:' : 'Last updated:'}</span> {POLICY_LAST_UPDATED_DATE}<span className="mx-2 text-slate-500">•</span><span className="font-semibold text-white">{isSpanish ? 'Versión:' : 'Version:'}</span> {CURRENT_PRIVACY_VERSION}</p>
        <nav aria-label="Table of contents" className="mt-8 rounded-xl border border-slate-800 bg-slate-950/70 p-5"><h2 className="text-lg font-semibold text-white">{isSpanish ? 'Tabla de contenidos' : 'Table of contents'}</h2><ol className="mt-3 grid gap-2 sm:grid-cols-2">{content.sections.map((section) => <li key={section.id}><a href={`#${section.id}`} className="text-cyan-300 transition hover:text-cyan-200">{section.label}</a></li>)}</ol></nav>
        {content.sections.map((section) => (
          <section key={section.id} id={section.id} className="mt-8 space-y-4">
            <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
            {section.body?.map((paragraph) => <p key={paragraph} className="text-slate-300">{paragraph}</p>)}
            {section.bullets ? <ul className="list-disc space-y-2 pl-6 text-slate-300">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
            {section.id === 'consent-storage' ? <div className="flex flex-wrap gap-3"><OpenPrivacyChoicesButton>{isSpanish ? 'Abrir opciones de privacidad' : 'Open privacy choices'}</OpenPrivacyChoicesButton><Link href="/privacy-choices" className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200">{isSpanish ? 'Página de opciones de privacidad' : 'Privacy choices page'}</Link></div> : null}
          </section>
        ))}
        <section className="mt-10 rounded-xl border border-slate-800 bg-slate-950/70 p-5 text-sm text-slate-300">
          <p>{isSpanish ? 'Enlaces relacionados:' : 'Related links:'}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/terms" className="font-semibold text-cyan-300 hover:text-cyan-200">{isSpanish ? 'Términos del servicio' : 'Terms of Service'}</Link>
            <Link href="/privacy-choices" className="font-semibold text-cyan-300 hover:text-cyan-200">{isSpanish ? 'Opciones de privacidad' : 'Privacy choices'}</Link>
            <Link href="/pricing" className="font-semibold text-cyan-300 hover:text-cyan-200">{isSpanish ? 'Precios' : 'Pricing'}</Link>
            <Link href="/contact" className="font-semibold text-cyan-300 hover:text-cyan-200">{isSpanish ? 'Contacto' : 'Contact'}</Link>
          </div>
          <p className="mt-3 text-slate-400"><a href={`mailto:${LEGAL_OPERATOR.email}`} className="text-cyan-300 hover:text-cyan-200">{LEGAL_OPERATOR.email}</a></p>
        </section>
      </article>
    </main>
  );
}
