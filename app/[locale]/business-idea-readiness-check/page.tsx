import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import SeoNextSteps from '@/components/seo/SeoNextSteps';
import BusinessIdeaReadinessAssessment from '@/components/business-idea-readiness/BusinessIdeaReadinessAssessment';
import { createMetadata } from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return createMetadata({ locale, pathname: '/business-idea-readiness-check', title: t('businessIdeaReadiness.title'), description: t('businessIdeaReadiness.description') });
}

export default async function BusinessIdeaReadinessCheckPage({ params }: Props) {
  const { locale } = await params;
  const isSpanish = locale === 'es';
  const nextSteps = isSpanish
    ? [
        { href: '/start', title: 'Ir a Start', description: 'Convierte tu resultado en un plan práctico de lanzamiento.' },
        { href: '/guide/start', title: 'Leer guías para empezar', description: 'Profundiza en validación, oferta y costos iniciales.' },
        { href: '/contact', title: 'Contactar a Ownward', description: 'Comparte tu principal bloqueo y recibe una recomendación inicial.' },
      ]
    : [
        { href: '/start', title: 'Go to Start', description: 'Turn your result into a practical launch plan.' },
        { href: '/guide/start', title: 'Read startup guides', description: 'Go deeper on validation, your first offer, and startup costs.' },
        { href: '/contact', title: 'Contact Ownward', description: 'Share your main blocker and get an initial recommendation.' },
      ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-24 sm:px-6 lg:pt-20">
        <div className="mx-auto mb-10 max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-xl font-semibold text-white">
            {isSpanish ? 'Qué obtienes en esta evaluación gratuita' : 'What you get in this free check'}
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>{isSpanish ? 'Resultado inmediato con puntaje de preparación (0-100).' : 'Immediate readiness score (0-100) with clear interpretation.'}</li>
            <li>{isSpanish ? 'Prioridades concretas para los próximos 7 días.' : 'Practical next-step priorities for your next 7 days.'}</li>
            <li>{isSpanish ? 'Sin pago, sin tarjeta y sin solicitud de datos personales.' : 'No payment, no card, and no personal data required.'}</li>
            <li>{isSpanish ? 'Duración estimada: 3-5 minutos.' : 'Estimated completion time: 3-5 minutes.'}</li>
          </ul>
          <p className="mt-4 text-xs leading-5 text-slate-400">
            {isSpanish
              ? 'Esta herramienta ofrece orientación informativa y no constituye asesoría legal, fiscal o financiera profesional.'
              : 'This tool provides informational guidance and does not constitute legal, tax, or financial professional advice.'}
          </p>
        </div>

        <BusinessIdeaReadinessAssessment />

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <h3 className="text-lg font-semibold text-white">
              {isSpanish ? 'Después del resultado' : 'After you get your result'}
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              {isSpanish
                ? 'Convierte tu diagnóstico en un plan de acción en la sección Start de Ownward.'
                : 'Turn your diagnosis into an action plan with Ownward Start.'}
            </p>
            <Link
              href="/start"
              className="mt-4 inline-flex rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              {isSpanish ? 'Ir a Start' : 'Go to Start'}
            </Link>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <h3 className="text-lg font-semibold text-white">
              {isSpanish ? '¿Necesitas ayuda personalizada?' : 'Need tailored help?'}
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              {isSpanish
                ? 'Escríbenos con tu principal bloqueo y te compartimos una recomendación inicial.'
                : 'Send us your main blocker and we will share an initial recommendation.'}
            </p>
            <Link
              href="/contact"
              className="mt-4 inline-flex rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
            >
              {isSpanish ? 'Contactar' : 'Contact us'}
            </Link>
          </div>
        </div>
        <SeoNextSteps heading={isSpanish ? "Siguientes pasos útiles" : "Useful next steps"} links={nextSteps} />
      </section>
    </div>
  );
}
