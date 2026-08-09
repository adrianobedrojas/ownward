import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createMetadata } from '@/lib/seo';
import ContactPageClient from './ContactPageClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return createMetadata({ locale, pathname: '/contact', title: t('contact.title'), description: t('contact.description') });
}

export default function ContactPage() {
  return <ContactPageClient />;
}
