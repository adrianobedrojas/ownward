import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SeoNextSteps from '@/components/seo/SeoNextSteps';
import { createMetadata } from '@/lib/seo';
import { createClient } from '@/lib/supabase/server';
import SaleReadinessClient from './SaleReadinessClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return createMetadata({
    locale,
    pathname: '/sale-readiness',
    title: locale === 'es' ? 'Evaluación de preparación para la venta' : 'Sale Readiness Assessment',
    description:
      locale === 'es'
        ? 'Evalúa qué tan preparado está tu negocio para una futura venta y detecta prioridades de mejora.'
        : 'Evaluate how prepared your business is for a future sale and identify improvement priorities.',
  });
}

export default async function SaleReadinessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/sale-readiness');
  }

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, profile_completion')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const { data: recentAssessments } = await supabase
    .from('sale_readiness_assessments')
    .select('id, business_id, overall_score, stage, scored_at')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('scored_at', { ascending: false })
    .limit(20);

  const nextSteps = locale === 'es'
    ? [
        { href: '/valuation', title: 'Ver la valuación', description: 'Usa tu preparación de venta junto con una vista de valor del negocio.' },
        { href: '/sell', title: 'Preparar un listado', description: 'Organiza lo que un comprador serio querrá revisar.' },
        { href: '/customer-concentration', title: 'Analizar concentración de clientes', description: 'Revisa un riesgo frecuente antes de salir al mercado.' },
      ]
    : [
        { href: '/valuation', title: 'Review your valuation', description: 'Pair sale readiness with a current view of business value.' },
        { href: '/sell', title: 'Prepare a listing', description: 'Organize what a serious buyer will expect to review.' },
        { href: '/customer-concentration', title: 'Analyze customer concentration', description: 'Review a common risk before going to market.' },
      ];

  return (
    <>
      <SaleReadinessClient
        businesses={businesses ?? []}
        recentAssessments={recentAssessments ?? []}
        userId={user.id}
      />
      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <SeoNextSteps heading={locale === 'es' ? 'Siguientes pasos útiles' : 'Useful next steps'} links={nextSteps} />
      </div>
    </>
  );
}
