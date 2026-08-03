import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import BusinessIdeaReadinessAssessment from '@/components/business-idea-readiness/BusinessIdeaReadinessAssessment';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ownwardhub.com';

  return {
    title: t('businessIdeaReadiness.title'),
    description: t('businessIdeaReadiness.description'),
    alternates: {
      canonical: `${siteUrl}/business-idea-readiness-check`,
      languages: {
        en: `${siteUrl}/business-idea-readiness-check`,
        es: `${siteUrl}/es/business-idea-readiness-check`,
      },
    },
    openGraph: {
      title: t('businessIdeaReadiness.title'),
      description: t('businessIdeaReadiness.description'),
      url:
        locale === 'es'
          ? `${siteUrl}/es/business-idea-readiness-check`
          : `${siteUrl}/business-idea-readiness-check`,
    },
  };
}

export default async function BusinessIdeaReadinessCheckPage({ params }: Props) {
  const { locale } = await params;
  // Suppress unused variable warning — locale is used for metadata
  void locale;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-24 sm:px-6 lg:pt-20">
        <BusinessIdeaReadinessAssessment />
      </section>
    </div>
  );
}
