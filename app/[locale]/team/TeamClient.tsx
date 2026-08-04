'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  inviteMember,
  cancelInvitation,
  changeMemberRole,
  suspendMember,
  reactivateMember,
  removeMember,
} from './actions';

interface Business { id: string; name: string; profile_completion: number; }
interface Member { id: string; business_id: string; user_id: string; role: string; status: string; joined_at: string | null; created_at: string; }
interface Invitation { id: string; business_id: string; email: string; role: string; status: string; expires_at: string; created_at: string; }
interface Membership { id: string; business_id: string; role: string; status: string; joined_at: string | null; }

interface Props {
  userId: string;
  ownedBusinesses: Business[];
  sharedBusinesses: Business[];
  myMemberships: Membership[];
  members: Member[];
  invitations: Invitation[];
  teamMemberLimit: number;
  usedSeats: number;
  locale: string;
}

const ROLE_OPTIONS = ['manager', 'finance', 'operations', 'viewer'] as const;

function roleLabel(t: ReturnType<typeof useTranslations<'Team'>>, role: string) {
  const map: Record<string, string> = {
    owner: t('roleOwner'),
    manager: t('roleManager'),
    finance: t('roleFinance'),
    operations: t('roleOperations'),
    viewer: t('roleViewer'),
  };
  return map[role] ?? role;
}

function statusLabel(t: ReturnType<typeof useTranslations<'Team'>>, status: string) {
  const map: Record<string, string> = {
    active: t('statusActive'),
    suspended: t('statusSuspended'),
    pending: t('statusPending'),
    accepted: t('statusAccepted'),
    declined: t('statusDeclined'),
    cancelled: t('statusCancelled'),
  };
  return map[status] ?? status;
}

export default function TeamClient({
  ownedBusinesses,
  sharedBusinesses,
  myMemberships,
  members,
  invitations,
  teamMemberLimit,
  usedSeats,
}: Props) {
  const t = useTranslations('Team');
  const [isPending, startTransition] = useTransition();
  const [inviteLinks, setInviteLinks] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const bizMembers = (bizId: string) => members.filter((m) => m.business_id === bizId);
  const bizInvites = (bizId: string) => invitations.filter((i) => i.business_id === bizId);
  const seatLimitReached = usedSeats >= teamMemberLimit;

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await inviteMember(data);
      if (result.success && result.inviteLink) {
        const bizId = data.get('businessId') as string;
        setInviteLinks((prev) => ({ ...prev, [bizId]: result.inviteLink! }));
        form.reset();
        setErrors((prev) => ({ ...prev, [bizId]: '' }));
      } else if (!result.success) {
        const bizId = data.get('businessId') as string;
        setErrors((prev) => ({ ...prev, [bizId]: result.error }));
      }
    });
  }

  function copyLink(bizId: string) {
    const link = inviteLinks[bizId];
    if (link) {
      navigator.clipboard.writeText(link).then(() => {
        setCopiedId(bizId);
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

      {/* Seat usage */}
      {teamMemberLimit > 0 && (
        <div className="mb-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
          <p className="text-sm text-slate-400">
            {t('seatsUsed')}: <span className="text-white font-semibold">{usedSeats}</span> / {teamMemberLimit}
            {' · '}
            {t('seatsAvailable')}: <span className="text-cyan-400 font-semibold">{Math.max(0, teamMemberLimit - usedSeats)}</span>
          </p>
          {seatLimitReached && (
            <p className="text-amber-400 text-sm mt-1">{t('seatLimitReached')}</p>
          )}
        </div>
      )}

      {/* My Businesses */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">{t('myBusinesses')}</h2>
        {ownedBusinesses.length === 0 && (
          <p className="text-slate-400">{t('noBusinesses')}</p>
        )}
        <div className="space-y-6">
          {ownedBusinesses.map((biz) => {
            const mems = bizMembers(biz.id);
            const invs = bizInvites(biz.id);
            return (
              <div key={biz.id} className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{biz.name}</h3>
                  <Link
                    href={`/business/${biz.id}`}
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    {t('enterWorkspace')}
                  </Link>
                </div>

                {/* Members */}
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">{t('members')}</h4>
                  {mems.length === 0 ? (
                    <p className="text-slate-500 text-sm">—</p>
                  ) : (
                    <ul className="space-y-2">
                      {mems.map((m) => (
                        <li key={m.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">
                            {roleLabel(t, m.role)} · {statusLabel(t, m.status)}
                          </span>
                          <span className="flex gap-2">
                            <select
                              defaultValue={m.role}
                              disabled={isPending}
                              onChange={(e) =>
                                startTransition(() => {
                                  void changeMemberRole(m.id, biz.id, e.target.value);
                                })
                              }
                              className="text-xs bg-slate-800 border border-slate-600 rounded px-1 py-0.5"
                            >
                              {ROLE_OPTIONS.map((r) => (
                                <option key={r} value={r}>{roleLabel(t, r)}</option>
                              ))}
                            </select>
                            {m.status === 'active' ? (
                              <button
                                onClick={() => startTransition(() => {
                                  void suspendMember(m.id, biz.id);
                                })}
                                disabled={isPending}
                                className="text-xs text-amber-400 hover:underline"
                              >
                                {t('suspendMember')}
                              </button>
                            ) : (
                              <button
                                onClick={() => startTransition(() => {
                                  void reactivateMember(m.id, biz.id);
                                })}
                                disabled={isPending}
                                className="text-xs text-green-400 hover:underline"
                              >
                                {t('reactivateMember')}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm(t('confirmRemove')))
                                  startTransition(() => {
                                    void removeMember(m.id, biz.id);
                                  });
                              }}
                              disabled={isPending}
                              className="text-xs text-red-400 hover:underline"
                            >
                              {t('removeMember')}
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Pending invitations */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">{t('pendingInvitations')}</h4>
                  {invs.length === 0 ? (
                    <p className="text-slate-500 text-sm">—</p>
                  ) : (
                    <ul className="space-y-1">
                      {invs.map((inv) => (
                        <li key={inv.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">
                            {inv.email} · {roleLabel(t, inv.role)} · {t('expiresAt')} {new Date(inv.expires_at).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => startTransition(() => {
                              void cancelInvitation(inv.id, biz.id);
                            })}
                            disabled={isPending}
                            className="text-xs text-red-400 hover:underline ml-2"
                          >
                            {t('cancelInvitation')}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Invite link display */}
                {inviteLinks[biz.id] && (
                  <div className="mb-3 p-3 bg-slate-800 rounded border border-cyan-600">
                    <p className="text-xs text-cyan-300 mb-1">{t('inviteCreated')}</p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={inviteLinks[biz.id]}
                        className="flex-1 text-xs bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-200"
                      />
                      <button
                        onClick={() => copyLink(biz.id)}
                        className="text-xs bg-cyan-600 hover:bg-cyan-500 px-2 py-1 rounded"
                      >
                        {copiedId === biz.id ? t('linkCopied') : t('copyLink')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Invite form */}
                {!seatLimitReached ? (
                  <form onSubmit={handleInvite} className="flex flex-wrap gap-2 items-end">
                    <input type="hidden" name="businessId" value={biz.id} />
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400">{t('email')}</label>
                      <input
                        name="email"
                        type="email"
                        required
                        placeholder="team@example.com"
                        className="text-sm bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400">{t('role')}</label>
                      <select
                        name="role"
                        defaultValue="viewer"
                        className="text-sm bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-100"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>{roleLabel(t, r)}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="text-sm bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-1.5 rounded font-semibold"
                    >
                      {t('sendInvite')}
                    </button>
                    {errors[biz.id] && (
                      <p className="w-full text-xs text-red-400">{errors[biz.id]}</p>
                    )}
                  </form>
                ) : (
                  <p className="text-xs text-amber-400">{t('seatLimitReached')}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Shared with me */}
      <section>
        <h2 className="text-xl font-semibold mb-4">{t('sharedWithMe')}</h2>
        {sharedBusinesses.length === 0 && (
          <p className="text-slate-400">{t('noSharedBusinesses')}</p>
        )}
        <div className="space-y-3">
          {sharedBusinesses.map((biz) => {
            const membership = myMemberships.find((m) => m.business_id === biz.id);
            return (
              <div key={biz.id} className="bg-slate-900 border border-slate-700 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{biz.name}</p>
                  {membership && (
                    <p className="text-sm text-slate-400">
                      {t('yourRole')}: {roleLabel(t, membership.role)} · {statusLabel(t, membership.status)}
                    </p>
                  )}
                  {membership?.status === 'suspended' && (
                    <p className="text-xs text-amber-400">{t('restrictedActions')}</p>
                  )}
                </div>
                {membership?.status === 'active' && (
                  <Link
                    href={`/business/${biz.id}`}
                    className="text-sm text-cyan-400 hover:underline"
                  >
                    {t('enterWorkspace')}
                  </Link>
                )}
                {membership?.status !== 'active' && (
                  <span className="text-sm text-slate-500">{t('readOnly')}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
