import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { createMetadata } from '@/lib/seo';
import GoalManager from './GoalManager';
import type { GrowthGoal } from './types';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return createMetadata({
    locale,
    pathname: '/grow',
    title: locale === 'es' ? 'Planificador de crecimiento a 90 días' : '90-Day Growth Planner',
    description:
      locale === 'es'
        ? 'Define metas medibles de crecimiento, sigue el progreso y enfócate en lo que impulsa tu negocio.'
        : 'Set measurable growth goals, track progress, and focus on what moves your business forward.',
  });
}

export default async function GrowPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data, error } = await supabase
    .from('growth_goals')
    .select(
      'id, user_id, business_id, title, category, metric_name, metric_unit, start_value, current_value, target_value, deadline, status, notes, created_at, updated_at'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <GoalManager
      initialGoals={(data as GrowthGoal[] | null) ?? []}
      initialError={error ? "We couldn't load your goals right now." : undefined}
    />
  );
}
