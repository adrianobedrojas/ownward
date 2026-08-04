'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { acceptInvitation, declineInvitation } from '../../actions';

interface Props {
  token: string;
  errorKey: string | null;
  invitation: { email: string; role: string; businessId: string } | null;
  businessName: string;
  locale: string;
  userEmail: string;
}

export default function InviteClient({ token, errorKey, invitation, businessName, locale, userEmail }: Props) {
  const t = useTranslations('Team');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  function roleLabel(role: string) {
    const map: Record<string, string> = {
      manager: t('roleManager'),
      finance: t('roleFinance'),
      operations: t('roleOperations'),
      viewer: t('roleViewer'),
    };
    return map[role] ?? role;
  }

  function handleAccept() {
    startTransition(async () => {
      const res = await acceptInvitation(token);
      setResult(res);
      if (res.success) {
        setTimeout(() => router.push(`/${locale}/team`), 1500);
      }
    });
  }

  function handleDecline() {
    startTransition(async () => {
      const res = await declineInvitation(token);
      setResult(res);
    });
  }

  const errorMessages: Record<string, string> = {
    inviteInvalid: t('inviteInvalid'),
    inviteCancelled: t('inviteCancelled'),
    inviteAlreadyUsed: t('inviteAlreadyUsed'),
    inviteExpired: t('inviteExpired'),
    wrong_email: t('inviteWrongEmail'),
    invalid: t('inviteInvalid'),
    cancelled: t('inviteCancelled'),
    already_used: t('inviteAlreadyUsed'),
    expired: t('inviteExpired'),
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-xl p-6">
        <h1 className="text-xl font-bold mb-4">{t('title')}</h1>

        {errorKey && (
          <p className="text-red-400">{errorMessages[errorKey] ?? t('inviteInvalid')}</p>
        )}

        {!errorKey && invitation && !result && (
          <div>
            <p className="text-slate-300 mb-4">
              {t('inviteFor')} <strong>{businessName}</strong> {t('inviteAsRole')} <strong>{roleLabel(invitation.role)}</strong>.
            </p>
            {userEmail.toLowerCase() !== invitation.email.toLowerCase() && (
              <p className="text-amber-400 text-sm mb-4">{t('inviteWrongEmail')}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={isPending}
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2 rounded"
              >
                {t('inviteAccept')}
              </button>
              <button
                onClick={handleDecline}
                disabled={isPending}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded"
              >
                {t('inviteDecline')}
              </button>
            </div>
          </div>
        )}

        {result?.success && (
          <div>
            <p className="text-green-400 mb-4">{t('inviteAccepted')}</p>
            <a href={`/${locale}/team`} className="text-cyan-400 hover:underline">{t('goToDashboard')}</a>
          </div>
        )}

        {result && !result.success && (
          <p className="text-red-400">{errorMessages[result.error ?? ''] ?? result.error}</p>
        )}
      </div>
    </div>
  );
}
