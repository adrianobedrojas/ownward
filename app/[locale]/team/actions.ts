'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import crypto from 'crypto';
import { getUserBillingState } from '@/lib/billing';
import { canManageTeam } from '@/lib/business-access';
import type { BusinessRole } from '@/lib/business-access';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TeamActionResult =
  | { success: true; message?: string; inviteLink?: string }
  | { success: false; error: string };

// ─── Seat counting ────────────────────────────────────────────────────────────

/**
 * Count unique active collaborators across all businesses owned by userId.
 * Excludes the owner themselves. Counts pending unexpired invitations too.
 */
async function countUsedSeats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('count_owner_collaborator_usage', {
    p_owner_user_id: ownerId,
  });
  if (error || typeof data !== 'number') return 0;
  return data;
}

// ─── Invite a member ─────────────────────────────────────────────────────────

export async function inviteMember(formData: FormData): Promise<TeamActionResult> {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  const businessId = formData.get('businessId') as string;
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const role = formData.get('role') as BusinessRole;

  if (!businessId || !email || !role) {
    return { success: false, error: 'Missing required fields' };
  }

  const validRoles: readonly BusinessRole[] = ['manager', 'finance', 'operations', 'viewer'];
  if (!validRoles.includes(role)) {
    return { success: false, error: 'Invalid role' };
  }

  // Verify the user is the owner (only owners can manage team)
  const canManage = await canManageTeam(user.id, businessId);
  if (!canManage) return { success: false, error: 'Forbidden: only owners can invite members' };

  // Seat limit check (server-side baseline check; DB function enforces atomically)
  const billing = await getUserBillingState(supabase, user.id);
  const limit = billing.entitlements.teamMemberLimit ?? 0;
  const used = await countUsedSeats(supabase, user.id);
  if (used >= limit) {
    return { success: false, error: 'Collaborator seat limit reached. Upgrade your plan to add more.' };
  }

  // Generate cryptographically secure token, store only hash
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'create_business_invitation_atomic',
    {
      p_business_id: businessId,
      p_email: email,
      p_role: role,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
      p_seat_limit: limit,
    }
  );

  if (rpcError || !rpcData) {
    return { success: false, error: 'Failed to create invitation.' };
  }

  if (Array.isArray(rpcData) && rpcData[0]?.ok !== true) {
    return { success: false, error: rpcData[0]?.error_message ?? 'Failed to create invitation.' };
  }

  // Audit event (no token logged)
  await supabase.from('business_activity_events').insert({
    business_id: businessId,
    user_id: user.id,
    event_type: 'invitation_created',
    source_table: 'business_member_invitations',
    metadata: { invited_email: email, role },
  });

  revalidatePath(`/${locale}/team`);

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const inviteLink = `${origin}/${locale}/team/invite/${rawToken}`;

  return { success: true, inviteLink };
}

// ─── Cancel invitation ────────────────────────────────────────────────────────

export async function cancelInvitation(invitationId: string, businessId: string): Promise<TeamActionResult> {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  const canManage = await canManageTeam(user.id, businessId);
  if (!canManage) return { success: false, error: 'Forbidden' };

  const { error } = await supabase
    .from('business_member_invitations')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('business_id', businessId)
    .eq('status', 'pending');

  if (error) return { success: false, error: 'Failed to cancel invitation.' };

  await supabase.from('business_activity_events').insert({
    business_id: businessId,
    user_id: user.id,
    event_type: 'invitation_cancelled',
    source_id: invitationId,
    source_table: 'business_member_invitations',
    metadata: { invitation_id: invitationId },
  });

  revalidatePath(`/${locale}/team`);
  return { success: true };
}

// ─── Change member role ───────────────────────────────────────────────────────

export async function changeMemberRole(memberId: string, businessId: string, newRole: string): Promise<TeamActionResult> {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  const canManage = await canManageTeam(user.id, businessId);
  if (!canManage) return { success: false, error: 'Forbidden' };

  const validRoles = ['manager', 'finance', 'operations', 'viewer'];
  if (!validRoles.includes(newRole)) return { success: false, error: 'Invalid role' };

  // Get prev role for audit
  const { data: prev } = await supabase
    .from('business_members')
    .select('role, user_id')
    .eq('id', memberId)
    .eq('business_id', businessId)
    .maybeSingle();

  const { error } = await supabase
    .from('business_members')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('business_id', businessId)
    .neq('role', 'owner'); // never change owner's role

  if (error) return { success: false, error: 'Failed to update role.' };

  await supabase.from('business_activity_events').insert({
    business_id: businessId,
    user_id: user.id,
    event_type: 'member_role_changed',
    metadata: { member_id: memberId, target_user_id: prev?.user_id, prev_role: prev?.role, new_role: newRole },
  });

  revalidatePath(`/${locale}/team`);
  return { success: true };
}

// ─── Suspend member ───────────────────────────────────────────────────────────

export async function suspendMember(memberId: string, businessId: string): Promise<TeamActionResult> {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  const canManage = await canManageTeam(user.id, businessId);
  if (!canManage) return { success: false, error: 'Forbidden' };

  const { data: prev } = await supabase.from('business_members').select('user_id').eq('id', memberId).maybeSingle();

  const { error } = await supabase
    .from('business_members')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('business_id', businessId)
    .neq('role', 'owner');

  if (error) return { success: false, error: 'Failed to suspend member.' };

  await supabase.from('business_activity_events').insert({
    business_id: businessId,
    user_id: user.id,
    event_type: 'member_suspended',
    metadata: { member_id: memberId, target_user_id: prev?.user_id },
  });

  revalidatePath(`/${locale}/team`);
  return { success: true };
}

// ─── Reactivate member ────────────────────────────────────────────────────────

export async function reactivateMember(memberId: string, businessId: string): Promise<TeamActionResult> {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  const canManage = await canManageTeam(user.id, businessId);
  if (!canManage) return { success: false, error: 'Forbidden' };

  const billing = await getUserBillingState(supabase, user.id);
  const seatLimit = billing.entitlements.teamMemberLimit ?? 0;

  const { data: rpcData, error } = await supabase.rpc('reactivate_business_member_atomic', {
    p_member_id: memberId,
    p_business_id: businessId,
    p_seat_limit: seatLimit,
  });

  if (error || !rpcData || (Array.isArray(rpcData) && rpcData[0]?.ok !== true)) {
    const msg = Array.isArray(rpcData) ? rpcData[0]?.error_message : null;
    return { success: false, error: msg ?? 'Failed to reactivate member.' };
  }

  const targetUserId = Array.isArray(rpcData) ? rpcData[0]?.target_user_id : null;

  await supabase.from('business_activity_events').insert({
    business_id: businessId,
    user_id: user.id,
    event_type: 'member_reactivated',
    source_id: memberId,
    source_table: 'business_members',
    metadata: { member_id: memberId, target_user_id: targetUserId },
  });

  revalidatePath(`/${locale}/team`);
  return { success: true };
}

// ─── Remove member ────────────────────────────────────────────────────────────

export async function removeMember(memberId: string, businessId: string): Promise<TeamActionResult> {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  const canManage = await canManageTeam(user.id, businessId);
  if (!canManage) return { success: false, error: 'Forbidden' };

  const { data: prev } = await supabase.from('business_members').select('user_id').eq('id', memberId).maybeSingle();

  const { error } = await supabase
    .from('business_members')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('business_id', businessId)
    .neq('role', 'owner');

  if (error) return { success: false, error: 'Failed to remove member.' };

  await supabase.from('business_activity_events').insert({
    business_id: businessId,
    user_id: user.id,
    event_type: 'member_removed',
    source_id: memberId,
    source_table: 'business_members',
    metadata: { member_id: memberId, target_user_id: prev?.user_id },
  });

  revalidatePath(`/${locale}/team`);
  return { success: true };
}

// ─── Accept invitation ────────────────────────────────────────────────────────

export async function acceptInvitation(rawToken: string): Promise<TeamActionResult> {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const billing = await getUserBillingState(supabase, user.id);
  const seatLimit = billing.entitlements.teamMemberLimit ?? 0;

  const { data: rpcData, error } = await supabase.rpc('accept_business_invitation_atomic', {
    p_token_hash: tokenHash,
    p_seat_limit: seatLimit,
  });

  if (error || !rpcData) return { success: false, error: 'invalid' };

  const row = Array.isArray(rpcData) ? rpcData[0] : null;
  if (!row?.ok) {
    const mapped = row?.error_code;
    if (mapped === 'revoked') return { success: false, error: 'cancelled' };
    if (mapped === 'already_used') return { success: false, error: 'already_used' };
    if (mapped === 'wrong_email') return { success: false, error: 'wrong_email' };
    if (mapped === 'expired') return { success: false, error: 'expired' };
    if (mapped === 'no_seat') return { success: false, error: 'no_seat' };
    return { success: false, error: mapped ?? 'invalid' };
  }

  revalidatePath(`/${locale}/team`);
  return { success: true };
}

// ─── Decline invitation ───────────────────────────────────────────────────────

export async function declineInvitation(rawToken: string): Promise<TeamActionResult> {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const { data: inv } = await supabase
    .from('business_member_invitations')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!inv) return { success: false, error: 'invalid' };
  if (inv.status !== 'pending') return { success: false, error: 'already_used' };
  if (new Date(inv.expires_at) < new Date()) return { success: false, error: 'expired' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .maybeSingle();

  const userEmail = (profile?.email ?? user.email ?? '').toLowerCase();
  if (userEmail !== String(inv.email ?? '').toLowerCase()) {
    return { success: false, error: 'wrong_email' };
  }

  await supabase
    .from('business_member_invitations')
    .update({ status: 'declined', declined_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', inv.id);

  await supabase.from('business_activity_events').insert({
    business_id: inv.business_id,
    user_id: user.id,
    event_type: 'invitation_declined',
    source_id: inv.id,
    source_table: 'business_member_invitations',
    metadata: { invitation_id: inv.id },
  });

  revalidatePath(`/${locale}/team`);
  return { success: true };
}
