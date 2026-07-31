import type { Metadata } from 'next';
import Link from 'next/link';
import { OpenPrivacyChoicesButton } from '@/components/PrivacyConsent';

export const metadata: Metadata = {
  title: 'Privacy Policy | Ownward Hub',
  description:
    'Learn how Ownward Hub collects, uses, shares, stores, and protects personal information.',
};

const effectiveDate = 'July 31, 2026';
const lastUpdatedDate = 'July 31, 2026';

const sections = [
  { id: 'overview', label: '1. Overview' },
  { id: 'information-we-collect', label: '2. Information We Collect' },
  { id: 'how-we-use-information', label: '3. How We Use Information' },
  { id: 'legal-bases', label: '4. Legal Bases for Processing' },
  { id: 'how-we-share-information', label: '5. How We Share Information' },
  { id: 'cookies-and-storage', label: '6. Cookies and Local Storage' },
  { id: 'data-retention', label: '7. Data Retention' },
  { id: 'data-security', label: '8. Data Security' },
  { id: 'your-rights', label: '9. Your Privacy Rights and Choices' },
  { id: 'international-transfers', label: '10. International Data Transfers' },
  { id: 'children', label: '11. Children’s Privacy' },
  { id: 'changes', label: '12. Changes to This Policy' },
  { id: 'contact', label: '13. Contact Us' },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Privacy Policy</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Ownward Hub Privacy Policy</h1>
        <p className="mt-4 text-sm text-slate-300">
          <span className="font-semibold text-white">Effective date:</span> {effectiveDate}
          <span className="mx-2 text-slate-500">•</span>
          <span className="font-semibold text-white">Last updated:</span> {lastUpdatedDate}
        </p>

        <nav aria-label="Table of contents" className="mt-8 rounded-xl border border-slate-800 bg-slate-950/70 p-5">
          <h2 className="text-lg font-semibold text-white">Table of contents</h2>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-cyan-300 transition hover:text-cyan-200">
                  {section.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <section id="overview" className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-white">1. Overview</h2>
          <p className="text-slate-300">
            Ownward Hub (“Ownward,” “we,” “our,” or “us”) provides tools and services to help users run,
            grow, buy, and sell businesses. This Privacy Policy explains how we collect, use, disclose, and
            protect personal information when you use our websites, applications, and related services
            (collectively, the “Services”).
          </p>
        </section>

        <section id="information-we-collect" className="mt-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">2. Information We Collect</h2>
          <ul className="list-disc space-y-2 pl-6 text-slate-300">
            <li>
              <span className="font-semibold text-white">Information you provide:</span> account details,
              profile information, contact form content, uploaded documents, and communications.
            </li>
            <li>
              <span className="font-semibold text-white">Transaction and service data:</span> records
              related to subscriptions, billing interactions, and use of product features.
            </li>
            <li>
              <span className="font-semibold text-white">Technical data:</span> device, browser, IP address,
              log and diagnostics data, and security telemetry.
            </li>
            <li>
              <span className="font-semibold text-white">Privacy settings data:</span> your selected privacy
              choices, including consent preferences stored in your browser.
            </li>
          </ul>
        </section>

        <section id="how-we-use-information" className="mt-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">3. How We Use Information</h2>
          <ul className="list-disc space-y-2 pl-6 text-slate-300">
            <li>Provide, operate, and improve the Services.</li>
            <li>Authenticate users, maintain account security, and prevent fraud or abuse.</li>
            <li>Process requests, support inquiries, and other communications.</li>
            <li>Comply with legal obligations and enforce our terms.</li>
            <li>Operate optional functionality, analytics, or marketing technologies only where permitted.</li>
          </ul>
        </section>

        <section id="legal-bases" className="mt-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">4. Legal Bases for Processing</h2>
          <p className="text-slate-300">
            Depending on your location, we may process personal information based on contract necessity,
            legitimate interests, legal obligations, and consent where required.
          </p>
        </section>

        <section id="how-we-share-information" className="mt-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">5. How We Share Information</h2>
          <p className="text-slate-300">We may share personal information with:</p>
          <ul className="list-disc space-y-2 pl-6 text-slate-300">
            <li>Service providers that host infrastructure, support authentication, and process payments.</li>
            <li>Professional advisors and authorities where required by law.</li>
            <li>Parties involved in a merger, acquisition, financing, or other corporate transaction.</li>
          </ul>
        </section>

        <section id="cookies-and-storage" className="mt-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">6. Cookies and Local Storage</h2>
          <p className="text-slate-300">
            Necessary storage supports authentication, security, requested workflows, and your privacy-choice
            record. Optional categories (functionality, analytics, and marketing) remain disabled unless you
            permit them.
          </p>
          <div className="flex flex-wrap gap-3">
            <OpenPrivacyChoicesButton>Open privacy choices</OpenPrivacyChoicesButton>
            <Link
              href="/privacy-choices"
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200"
            >
              Privacy choices page
            </Link>
          </div>
        </section>

        <section id="data-retention" className="mt-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">7. Data Retention</h2>
          <p className="text-slate-300">
            We retain personal information for as long as needed to provide Services, meet legal obligations,
            resolve disputes, and enforce agreements.
          </p>
        </section>

        <section id="data-security" className="mt-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">8. Data Security</h2>
          <p className="text-slate-300">
            We use administrative, technical, and physical safeguards designed to protect personal information.
            No method of transmission or storage is fully secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section id="your-rights" className="mt-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">9. Your Privacy Rights and Choices</h2>
          <p className="text-slate-300">
            Depending on applicable law, you may have rights to access, correct, delete, restrict, object to,
            or export personal information. You may also update optional privacy preferences at any time.
          </p>
        </section>

        <section id="international-transfers" className="mt-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">10. International Data Transfers</h2>
          <p className="text-slate-300">
            We may process information in countries other than your own and apply safeguards as required by
            applicable law.
          </p>
        </section>

        <section id="children" className="mt-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">11. Children’s Privacy</h2>
          <p className="text-slate-300">
            The Services are not directed to children under 13 (or higher age where required by local law),
            and we do not knowingly collect personal information from children.
          </p>
        </section>

        <section id="changes" className="mt-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">12. Changes to This Policy</h2>
          <p className="text-slate-300">
            We may update this Privacy Policy from time to time. Material changes will be posted with an
            updated effective date and last-updated date.
          </p>
        </section>

        <section id="contact" className="mt-8 space-y-4">
          <h2 className="text-2xl font-semibold text-white">13. Contact Us</h2>
          <p className="text-slate-300">
            For privacy requests or questions, contact us at{' '}
            <Link href="mailto:privacy@ownwardhub.com" className="font-semibold text-cyan-300 hover:text-cyan-200">
              privacy@ownwardhub.com
            </Link>
            ,{' '}
            <Link href="mailto:support@ownwardhub.com" className="font-semibold text-cyan-300 hover:text-cyan-200">
              support@ownwardhub.com
            </Link>
            , or{' '}
            <Link href="mailto:legal@ownwardhub.com" className="font-semibold text-cyan-300 hover:text-cyan-200">
              legal@ownwardhub.com
            </Link>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
