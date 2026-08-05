import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserBillingState } from '@/lib/billing';
import ContextualSolutionModule from '@/components/solutions/ContextualSolutionModule';
import TeamClient from './TeamClient';
import { getLocale } from 'next-intl/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Team | Ownward',
  description: 'Manage your team and collaborators.',
};

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const locale = await getLocale();

  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/team`);
  }

  const billing = await getUserBillingState(supabase, user.id);
  const teamMemberLimit = billing.entitlements.teamMemberLimit ?? 0;

  // Businesses I own
  const { data: ownedBusinesses } = await supabase
    .from('businesses')
    .select('id, name, profile_completion')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const ownedIds = (ownedBusinesses ?? []).map((b) => b.id);

  // Members for owned businesses
  const { data: members } = ownedIds.length > 0
    ? await supabase
        .from('business_members')
        .select('id, business_id, user_id, role, status, joined_at, created_at')
        .in('business_id', ownedIds)
        .neq('role', 'owner')
    : { data: [] };

  // Pending invitations for owned businesses
  const { data: invitations } = ownedIds.length > 0
    ? await supabase
        .from('business_member_invitations')
        .select('id, business_id, email, role, status, expires_at, created_at')
        .in('business_id', ownedIds)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
    : { data: [] };

  // Businesses shared with me (where I am a member, not owner)
  const { data: myMemberships } = await supabase
    .from('business_members')
    .select('id, business_id, role, status, joined_at')
    .eq('user_id', user.id)
    .neq('role', 'owner');

  const sharedBizIds = (myMemberships ?? []).map((m) => m.business_id);
  const { data: sharedBusinesses } = sharedBizIds.length > 0
    ? await supabase
        .from('businesses')
        .select('id, name, profile_completion')
        .in('id', sharedBizIds)
        .is('deleted_at', null)
    : { data: [] };

  const { data: seatUsageCount } = await supabase.rpc('count_owner_collaborator_usage', {
    p_owner_user_id: user.id,
  });
  const usedSeats = typeof seatUsageCount === 'number' ? seatUsageCount : 0;

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <ContextualSolutionModule
          placement="team"
          locale={locale === 'es' ? 'es' : 'en'}
          userId={user.id}
          currentPlan={billing.plan}
        />
      </div>
      <TeamClient
        userId={user.id}
        ownedBusinesses={ownedBusinesses ?? []}
        sharedBusinesses={sharedBusinesses ?? []}
        myMemberships={myMemberships ?? []}
        members={members ?? []}
        invitations={invitations ?? []}
        teamMemberLimit={teamMemberLimit}
        usedSeats={usedSeats}
        locale={locale}
      />
    </>
  );
}
