import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTranslations, getLocale } from 'next-intl/server';
import crypto from 'crypto';
import InviteClient from './InviteClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Team Invitation | Ownward',
};

interface Props {
  params: Promise<{ token: string; locale: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();
  const locale = await getLocale();
  const t = await getTranslations('Team');

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Preserve token in redirect
    redirect(`/${locale}/login?next=/${locale}/team/invite/${encodeURIComponent(token)}`);
  }

  // Look up invitation by token hash (never log the raw token)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const { data: inv } = await supabase
    .from('business_member_invitations')
    .select('id, business_id, email, role, status, expires_at, invited_by')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  let errorKey: string | null = null;
  let businessName = '';

  if (!inv) {
    errorKey = 'inviteInvalid';
  } else if (inv.status === 'cancelled') {
    errorKey = 'inviteCancelled';
  } else if (inv.status === 'accepted' || inv.status === 'declined') {
    errorKey = 'inviteAlreadyUsed';
  } else if (new Date(inv.expires_at) < new Date()) {
    errorKey = 'inviteExpired';
  } else {
    // Fetch business name
    const { data: biz } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', inv.business_id)
      .maybeSingle();
    businessName = biz?.name ?? '';
  }

  return (
    <InviteClient
      token={token}
      errorKey={errorKey}
      invitation={inv ? { email: inv.email, role: inv.role, businessId: inv.business_id } : null}
      businessName={businessName}
      locale={locale}
      userEmail={user.email ?? ''}
    />
  );
}
