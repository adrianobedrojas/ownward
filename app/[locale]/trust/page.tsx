import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LEGAL_OPERATOR } from '@/lib/legal-content';
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  POLICY_EFFECTIVE_DATE,
  POLICY_LAST_UPDATED_DATE,
} from '@/lib/policies';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('trust.title'), description: t('trust.description') };
}

const EN_BODY =
  'Name:%0A' +
  'Ownward account email:%0A' +
  'Request category:%0A' +
  'Relevant listing, purchase, or transaction reference:%0A' +
  'Description:';

const ES_BODY =
  'Nombre:%0A' +
  'Correo asociado con la cuenta de Ownward:%0A' +
  'Categoría de la solicitud:%0A' +
  'Referencia de anuncio, compra o transacción:%0A' +
  'Descripción:';

interface RequestCategory {
  id: string;
  title: string;
  description: string;
  subject: string;
}

const EN_REQUEST_CATEGORIES: RequestCategory[] = [
  {
    id: 'privacy',
    title: 'Privacy or personal-data request',
    description: 'Request access to, correction of, or deletion of personal data associated with your account.',
    subject: 'Ownward privacy request',
  },
  {
    id: 'deletion',
    title: 'Account deletion request',
    description: 'Request the deletion of your Ownward account and associated personal data.',
    subject: 'Ownward account deletion request',
  },
  {
    id: 'terms',
    title: 'Terms or contractual question',
    description: 'Ask a question about the Terms of Service or a contractual matter related to your use of Ownward.',
    subject: 'Ownward legal question',
  },
  {
    id: 'listing',
    title: 'Marketplace listing concern',
    description: 'Report a concern about a marketplace listing, such as inaccurate information or policy violation.',
    subject: 'Ownward marketplace listing concern',
  },
  {
    id: 'billing',
    title: 'Billing or subscription concern',
    description: 'Ask a question or report an issue related to billing, subscription charges, or refunds.',
    subject: 'Ownward billing concern',
  },
  {
    id: 'ip',
    title: 'Intellectual-property concern',
    description: 'Report potential infringement of intellectual property rights or a related concern.',
    subject: 'Ownward intellectual property concern',
  },
  {
    id: 'security',
    title: 'Security concern',
    description: 'Report a potential security vulnerability or unauthorized access incident.',
    subject: 'Ownward security concern',
  },
  {
    id: 'other',
    title: 'Other legal matter',
    description: 'Submit any other legal or compliance inquiry not covered by the categories above.',
    subject: 'Ownward other legal matter',
  },
];

const ES_REQUEST_CATEGORIES: RequestCategory[] = [
  {
    id: 'privacy',
    title: 'Solicitud de privacidad o datos personales',
    description: 'Solicita acceso, corrección o eliminación de datos personales asociados a tu cuenta.',
    subject: 'Solicitud de privacidad de Ownward',
  },
  {
    id: 'deletion',
    title: 'Solicitud de eliminación de cuenta',
    description: 'Solicita la eliminación de tu cuenta de Ownward y los datos personales asociados.',
    subject: 'Solicitud de eliminación de cuenta de Ownward',
  },
  {
    id: 'terms',
    title: 'Pregunta sobre términos o asunto contractual',
    description: 'Realiza una consulta sobre los Términos del servicio o un asunto contractual relacionado con tu uso de Ownward.',
    subject: 'Pregunta legal de Ownward',
  },
  {
    id: 'listing',
    title: 'Problema relacionado con un anuncio del mercado',
    description: 'Reporta un problema con un anuncio del mercado, como información inexacta o una posible infracción de políticas.',
    subject: 'Problema con anuncio del mercado de Ownward',
  },
  {
    id: 'billing',
    title: 'Problema de facturación o suscripción',
    description: 'Realiza una consulta o reporta un problema relacionado con cobros, suscripciones o reembolsos.',
    subject: 'Problema de facturación de Ownward',
  },
  {
    id: 'ip',
    title: 'Problema de propiedad intelectual',
    description: 'Reporta una posible infracción de derechos de propiedad intelectual o una preocupación relacionada.',
    subject: 'Problema de propiedad intelectual de Ownward',
  },
  {
    id: 'security',
    title: 'Problema de seguridad',
    description: 'Reporta una posible vulnerabilidad de seguridad o un incidente de acceso no autorizado.',
    subject: 'Problema de seguridad de Ownward',
  },
  {
    id: 'other',
    title: 'Otro asunto legal',
    description: 'Envía cualquier consulta legal o de cumplimiento no cubierta por las categorías anteriores.',
    subject: 'Otro asunto legal de Ownward',
  },
];

function buildMailtoHref(subject: string, body: string): string {
  return `mailto:${LEGAL_OPERATOR.email}?subject=${encodeURIComponent(subject)}&body=${body}`;
}

export default async function TrustPage() {
  const locale = await getLocale();
  const isSpanish = locale === 'es';
  const categories = isSpanish ? ES_REQUEST_CATEGORIES : EN_REQUEST_CATEGORIES;
  const body = isSpanish ? ES_BODY : EN_BODY;

  const policyHistory = [
    {
      document: isSpanish ? 'Términos del servicio' : 'Terms of Service',
      version: CURRENT_TERMS_VERSION,
      effectiveDate: POLICY_EFFECTIVE_DATE,
      lastUpdated: POLICY_LAST_UPDATED_DATE,
      changes: isSpanish ? 'Versión inicial pública.' : 'Initial public version.',
      href: '/terms',
    },
    {
      document: isSpanish ? 'Política de privacidad' : 'Privacy Policy',
      version: CURRENT_PRIVACY_VERSION,
      effectiveDate: POLICY_EFFECTIVE_DATE,
      lastUpdated: POLICY_LAST_UPDATED_DATE,
      changes: isSpanish ? 'Versión inicial pública.' : 'Initial public version.',
      href: '/privacy',
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <article className="space-y-10">

        {/* Header */}
        <header className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            {isSpanish ? 'Legal y confianza' : 'Legal and Trust'}
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            {isSpanish ? 'Centro legal y de confianza' : 'Legal and Trust Center'}
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-slate-300">
            {isSpanish
              ? 'Ownward proporciona software, recursos educativos, herramientas de gestión empresarial, funcionalidad de mercado e información asistida por tecnología. A menos que un servicio específico indique lo contrario, Ownward no verifica de forma independiente cada declaración enviada por los usuarios, no garantiza una oportunidad de negocio, no proporciona asesoramiento legal ni fiscal, y no garantiza resultados de valoración ni de transacción.'
              : 'Ownward provides software, educational resources, business-management tools, marketplace functionality, and technology-assisted insights. Unless a specific service expressly states otherwise, Ownward does not independently verify every user-submitted statement, guarantee a business opportunity, provide legal or tax advice, or guarantee a valuation or transaction outcome.'}
          </p>
        </header>

        {/* A. Legal Documents */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-white">
            {isSpanish ? 'Documentos legales' : 'Legal documents'}
          </h2>
          <p className="mt-3 text-slate-300">
            {isSpanish
              ? 'Los siguientes documentos rigen el uso de los servicios de Ownward Hub.'
              : 'The following documents govern use of Ownward Hub services.'}
          </p>
          <ul className="mt-5 space-y-3">
            <li>
              <Link href="/terms" className="font-semibold text-cyan-300 transition hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">
                {isSpanish ? 'Términos del servicio' : 'Terms of Service'}
              </Link>
              <p className="mt-1 text-sm text-slate-400">
                {isSpanish ? 'Reglas para usar la plataforma, el mercado, las suscripciones y los servicios de Ownward Hub.' : 'Rules for using the Ownward Hub platform, marketplace, subscriptions, and services.'}
              </p>
            </li>
            <li>
              <Link href="/privacy" className="font-semibold text-cyan-300 transition hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">
                {isSpanish ? 'Política de privacidad' : 'Privacy Policy'}
              </Link>
              <p className="mt-1 text-sm text-slate-400">
                {isSpanish ? 'Qué información recopila Ownward, cómo la usa y los controles disponibles para los usuarios.' : 'What information Ownward collects, how it is used, and available user controls.'}
              </p>
            </li>
            <li>
              <Link href="/privacy-choices" className="font-semibold text-cyan-300 transition hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">
                {isSpanish ? 'Opciones de privacidad' : 'Privacy Choices'}
              </Link>
              <p className="mt-1 text-sm text-slate-400">
                {isSpanish ? 'Administra tus preferencias de cookies y almacenamiento local opcional.' : 'Manage your optional cookie and local-storage preferences.'}
              </p>
            </li>
          </ul>
        </section>

        {/* B. Contact Ownward */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-white">
            {isSpanish ? 'Contacto legal y de privacidad' : 'Legal and privacy contact'}
          </h2>
          <p className="mt-3 leading-7 text-slate-300">
            {isSpanish
              ? 'Las preguntas sobre los Términos, solicitudes de privacidad, inquietudes sobre datos de cuenta u otros asuntos legales pueden enviarse a '
              : 'Questions about these Terms, privacy requests, account-data concerns, or other legal matters may be sent to '}
            <a
              href={`mailto:${LEGAL_OPERATOR.email}`}
              aria-label={isSpanish ? `Enviar correo a ${LEGAL_OPERATOR.email}` : `Send email to ${LEGAL_OPERATOR.email}`}
              className="font-semibold text-cyan-300 underline-offset-2 transition hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              {LEGAL_OPERATOR.email}
            </a>
            {isSpanish ? '.' : '.'}
          </p>
          <p className="mt-3 leading-7 text-slate-300">
            {isSpanish
              ? 'Al contactar a Ownward, incluye tu nombre, el correo asociado a tu cuenta, la naturaleza de tu solicitud y cualquier referencia relevante de anuncio, compra, cuenta o transacción.'
              : 'When contacting Ownward, include your name, the email associated with your account, the nature of your request, and any relevant listing, purchase, account, or transaction reference.'}
          </p>
          <p className="mt-3 leading-7 text-sm text-slate-400">
            {isSpanish
              ? 'No envíes contraseñas, números completos de tarjeta de pago, números de identificación gubernamental, credenciales de cuentas financieras ni otra información sensible innecesaria.'
              : 'Do not send passwords, complete payment-card numbers, government identification numbers, financial-account credentials, or other unnecessary sensitive information.'}
          </p>
          <p className="mt-3 leading-7 text-sm text-slate-400">
            {isSpanish
              ? 'Ownward puede solicitar información adicional cuando sea razonablemente necesario para comprender la solicitud, verificar la identidad, proteger una cuenta o prevenir divulgaciones no autorizadas.'
              : 'Ownward may request additional information when reasonably necessary to understand the request, verify identity, protect an account, or prevent unauthorized disclosure.'}
          </p>
        </section>

        {/* C. Privacy Choices */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-white">
            {isSpanish ? 'Entiende tus opciones de privacidad' : 'Understand your privacy choices'}
          </h2>
          <ul className="mt-4 space-y-4 text-slate-300">
            <li>
              <strong className="text-white">{isSpanish ? 'Revisar o cambiar preferencias de consentimiento:' : 'Review or change consent preferences:'}</strong>{' '}
              {isSpanish
                ? 'Usa el panel de opciones de privacidad o visita la '
                : 'Use the privacy choices panel or visit the '}
              <Link href="/privacy-choices" className="font-semibold text-cyan-300 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">
                {isSpanish ? 'página de opciones de privacidad' : 'Privacy Choices page'}
              </Link>
              {isSpanish
                ? ' para activar o desactivar el almacenamiento de funcionalidad y la analítica opcional.'
                : ' to enable or disable optional functionality storage and analytics.'}
            </li>
            <li>
              <strong className="text-white">{isSpanish ? 'Solicitar acceso o corrección de datos:' : 'Request data access or correction:'}</strong>{' '}
              {isSpanish
                ? 'El acceso o corrección automatizada de datos de la cuenta no está disponible actualmente como función de autoservicio. Para realizar una solicitud, envía un correo a '
                : 'Automated account-data access or correction is not currently available as a self-service feature. To submit a request, email '}
              <a href={`mailto:${LEGAL_OPERATOR.email}`} className="font-semibold text-cyan-300 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">{LEGAL_OPERATOR.email}</a>
              {'.'}
            </li>
            <li>
              <strong className="text-white">{isSpanish ? 'Solicitar eliminación de cuenta o datos personales:' : 'Request account or personal-data deletion:'}</strong>{' '}
              {isSpanish
                ? 'La eliminación automatizada de cuentas no está disponible actualmente como función de autoservicio. Para solicitar la eliminación, envía un correo a '
                : 'Automated account deletion is not currently available as a self-service feature. To request deletion, email '}
              <a href={`mailto:${LEGAL_OPERATOR.email}`} className="font-semibold text-cyan-300 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">{LEGAL_OPERATOR.email}</a>
              {isSpanish ? ' con el asunto "Solicitud de eliminación de cuenta".' : ' with the subject "Ownward account deletion request".'}
            </li>
            <li>
              <strong className="text-white">{isSpanish ? 'Contactar a Ownward sobre privacidad:' : 'Contact Ownward about a privacy concern:'}</strong>{' '}
              <a href={`mailto:${LEGAL_OPERATOR.email}`} className="font-semibold text-cyan-300 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">{LEGAL_OPERATOR.email}</a>
            </li>
          </ul>
        </section>

        {/* D. Policy History */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-white">
            {isSpanish ? 'Historial de la política' : 'Policy history'}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {isSpanish ? 'Solo se muestra la versión actual. Las versiones anteriores se publicarán cuando estén disponibles.' : 'Only the current version is shown. Previous versions will be listed here when available.'}
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead>
                <tr className="border-b border-slate-700 text-left text-white">
                  <th className="pb-3 pr-4 font-semibold">{isSpanish ? 'Documento' : 'Document'}</th>
                  <th className="pb-3 pr-4 font-semibold">{isSpanish ? 'Versión' : 'Version'}</th>
                  <th className="pb-3 pr-4 font-semibold">{isSpanish ? 'Fecha de entrada en vigor' : 'Effective date'}</th>
                  <th className="pb-3 pr-4 font-semibold">{isSpanish ? 'Última actualización' : 'Last updated'}</th>
                  <th className="pb-3 pr-4 font-semibold">{isSpanish ? 'Cambios' : 'Changes'}</th>
                </tr>
              </thead>
              <tbody>
                {policyHistory.map((entry) => (
                  <tr key={entry.document} className="border-b border-slate-800">
                    <td className="py-3 pr-4">
                      <Link href={entry.href} className="font-semibold text-cyan-300 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">
                        {entry.document}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{entry.version}</td>
                    <td className="py-3 pr-4">{entry.effectiveDate}</td>
                    <td className="py-3 pr-4">{entry.lastUpdated}</td>
                    <td className="py-3 pr-4">{entry.changes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* E. What do you need help with? */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-white">
            {isSpanish ? '¿Con qué necesitas ayuda?' : 'What do you need help with?'}
          </h2>
          <p className="mt-3 text-slate-300">
            {isSpanish
              ? 'Selecciona la categoría que mejor describa tu solicitud. Cada botón abre un correo prefill con asunto y plantilla de información incluidos.'
              : 'Select the category that best describes your request. Each button opens a prefilled email with subject line and information template.'}
          </p>
          <ul className="mt-6 space-y-5">
            {categories.map((cat) => (
              <li key={cat.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <h3 className="font-semibold text-white">{cat.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{cat.description}</p>
                <a
                  href={buildMailtoHref(cat.subject, body)}
                  aria-label={isSpanish ? `Enviar solicitud: ${cat.title}` : `Submit request: ${cat.title}`}
                  className="mt-3 inline-block rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  {isSpanish ? 'Enviar solicitud' : 'Submit request'}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-slate-500">
            {isSpanish
              ? 'No incluyas contraseñas, números completos de tarjeta de pago, números de identificación gubernamental ni credenciales de cuentas financieras en tu solicitud.'
              : 'Do not include passwords, complete payment-card numbers, government identification numbers, or financial-account credentials in your request.'}
          </p>
        </section>

      </article>
    </main>
  );
}
