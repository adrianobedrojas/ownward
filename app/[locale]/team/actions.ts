'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import crypto from 'crypto';
import { getUserBillingState } from '@/lib/billing';
import { canManageTeam } from '@/lib/business-access';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TeamActionResult =
  | { success: true; message?: string; inviteLink?: string }
  | { success: false; error: string };

// ─── Seat counting ────────────────────────────────────────────────────────────

/**
 * Count unique active collaborators across all businesses owned by userId.
 * Excludes the owner themselves. Counts pending unexpired invitations too.
 */
async function countUsedSeats(supabase: Awaited<ReturnType<typeof createClient>>, ownerId: string): Promise<number> {
  // Get all business IDs owned by this user
  const { data: bizRows } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', ownerId)
    .is('deleted_at', null);

  if (!bizRows || bizRows.length === 0) return 0;
  const bizIds = bizRows.map((b) => b.id);

  // Count unique active members (excluding owner)
  const { data: members } = await supabase
    .from('business_members')
    .select('user_id')
    .in('business_id', bizIds)
    .eq('status', 'active')
    .neq('role', 'owner');

  const uniqueMembers = new Set((members ?? []).map((m) => m.user_id));

  // Count pending unexpired invitations
  const { data: pendingInvites } = await supabase
    .from('business_member_invitations')
    .select('email')
    .in('business_id', bizIds)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString());

  const uniquePendingEmails = new Set((pendingInvites ?? []).map((i) => i.email));

  // Combine: pending emails that are NOT already active members (by email)
  // We can't match email to user easily, so just add them
  return uniqueMembers.size + uniquePendingEmails.size;
}

// ─── Invite a member ─────────────────────────────────────────────────────────

export async function inviteMember(formData: FormData): Promise<TeamActionResult> {
  const supabase = await createClient();
  const locale = await getLocale();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Unauthorized' };

  const businessId = formData.get('businessId') as string;
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const role = formData.get('role') as string;

  if (!businessId || !email || !role) {
    return { success: false, error: 'Missing required fields' };
  }

  const validRoles = ['manager', 'finance', 'operations', 'viewer'];
  if (!validRoles.includes(role)) {
    return { success: false, error: 'Invalid role' };
  }

  // Verify the user is the owner (only owners can manage team)
  const canManage = await canManageTeam(user.id, businessId);
  if (!canManage) return { success: false, error: 'Forbidden: only owners can invite members' };

  // Seat limit check
  const billing = await getUserBillingState(supabase, user.id);
  const limit = billing.entitlements.teamMemberLimit ?? 0;
  const used = await countUsedSeats(supabase, user.id);
  if (used >= limit) {
    return { success: false, error: 'Collaborator seat limit reached. Upgrade your plan to add more.' };
  }

  // Prevent duplicate pending invitation
  const { data: existing } = await supabase
    .from('business_member_invitations')
    .select('id')
    .eq('business_id', businessId)
    .eq('email', email)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'An active invitation already exists for this email address.' };
  }

  // Generate cryptographically secure token, store only hash
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase
    .from('business_member_invitations')
    .insert({
      business_id: businessId,
      invited_by: user.id,
      email,
      role,
      token_hash: tokenHash,
      status: 'pending',
      expires_at: expiresAt,
    });

  if (insertError) {
    return { success: false, error: 'Failed to create invitation.' };
  }

  // Audit event (no token logged)
  await supabase.from('business_activity_events').insert({
    business_id: businessId,
    user_id: user.id,
    event_type: 'invitation_created',
    metadata: { invited_email: email, role },
  }).throwOnError().catch(() => null); // best-effort

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
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('business_id', businessId)
    .eq('status', 'pending');

  if (error) return { success: false, error: 'Failed to cancel invitation.' };

  await supabase.from('business_activity_events').insert({
    business_id: businessId,
    user_id: user.id,
    event_type: 'invitation_cancelled',
    metadata: { invitation_id: invitationId },
  }).throwOnError().catch(() => null);

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
  }).throwOnError().catch(() => null);

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
  }).throwOnError().catch(() => null);

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

  const { data: prev } = await supabase.from('business_members').select('user_id').eq('id', memberId).maybeSingle();

  const { error } = await supabase
    .from('business_members')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('business_id', businessId);

  if (error) return { success: false, error: 'Failed to reactivate member.' };

  await supabase.from('business_activity_events').insert({
    business_id: businessId,
    user_id: user.id,
    event_type: 'member_reactivated',
    metadata: { member_id: memberId, target_user_id: prev?.user_id },
  }).throwOnError().catch(() => null);

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
    .delete()
    .eq('id', memberId)
    .eq('business_id', businessId)
    .neq('role', 'owner');

  if (error) return { success: false, error: 'Failed to remove member.' };

  await supabase.from('business_activity_events').insert({
    business_id: businessId,
    user_id: user.id,
    event_type: 'member_removed',
    metadata: { member_id: memberId, target_user_id: prev?.user_id },
  }).throwOnError().catch(() => null);

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

  const { data: inv } = await supabase
    .from('business_member_invitations')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!inv) return { success: false, error: 'invalid' };
  if (inv.status === 'cancelled') return { success: false, error: 'cancelled' };
  if (inv.status === 'accepted') return { success: false, error: 'already_used' };
  if (inv.status === 'declined') return { success: false, error: 'already_used' };
  if (new Date(inv.expires_at) < new Date()) return { success: false, error: 'expired' };

  // Verify email matches logged-in user
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .maybeSingle();
  
  const userEmail = (profile?.email ?? user.email ?? '').toLowerCase();
  if (userEmail !== inv.email.toLowerCase()) {
    return { success: false, error: 'wrong_email' };
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from('business_members')
    .select('id')
    .eq('business_id', inv.business_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existingMember) {
    const { error: insertError } = await supabase.from('business_members').insert({
      business_id: inv.business_id,
      user_id: user.id,
      role: inv.role,
      status: 'active',
      invited_by: inv.invited_by,
      joined_at: new Date().toISOString(),
    });
    if (insertError) return { success: false, error: 'Failed to join team.' };
  }

  await supabase
    .from('business_member_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', inv.id);

  await supabase.from('business_activity_events').insert({
    business_id: inv.business_id,
    user_id: user.id,
    event_type: 'invitation_accepted',
    metadata: { invitation_id: inv.id, role: inv.role },
  }).throwOnError().catch(() => null);

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

  await supabase
    .from('business_member_invitations')
    .update({ status: 'declined', declined_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', inv.id);

  await supabase.from('business_activity_events').insert({
    business_id: inv.business_id,
    user_id: user.id,
    event_type: 'invitation_declined',
    metadata: { invitation_id: inv.id },
  }).throwOnError().catch(() => null);

  revalidatePath(`/${locale}/team`);
  return { success: true };
}
