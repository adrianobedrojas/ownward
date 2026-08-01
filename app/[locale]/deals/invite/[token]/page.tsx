import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import {
  acceptDealRoomInvitation,
  declineDealRoomInvitation,
  openDealRoomInvitation,
} from "@/app/[locale]/deals/actions";

interface InvitePageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}

async function acceptAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const result = await acceptDealRoomInvitation(formData);
  if (result.error) {
    redirect(`/deals/invite/${token}?error=${encodeURIComponent(result.error)}`);
  }
  const dealRoomId = (result.data as { dealRoomId?: string } | undefined)?.dealRoomId;
  if (dealRoomId) {
    redirect(`/deals/${dealRoomId}?success=InvitationAccepted`);
  }
  redirect(`/deals?success=InvitationAccepted`);
}

async function declineAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const result = await declineDealRoomInvitation(formData);
  if (result.error) {
    redirect(`/deals/invite/${token}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/deals?success=InvitationDeclined`);
}

export default async function DealRoomInvitePage({
  params,
  searchParams,
}: InvitePageProps) {
  await requireUser();
  const { token } = await params;
  const search = await searchParams;
  const openResult = await openDealRoomInvitation(token);

  const errorMessage = search.error ?? openResult.error;
  const successMessage = search.success;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-100">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          Ownward Deal Room
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">
          Deal Room invitation
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Accepting will activate your access to the confidential Deal Room.
          Invitations are single-use and can expire or be revoked by the seller.
        </p>

        {errorMessage && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {successMessage}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <form action={acceptAction}>
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="w-full rounded-lg bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Accept invitation
            </button>
          </form>

          <form action={declineAction}>
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="w-full rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              Decline invitation
            </button>
          </form>
        </div>

        <Link
          href="/deals"
          className="mt-6 inline-block text-sm font-semibold text-cyan-300 hover:underline"
        >
          Back to Deal Rooms
        </Link>
      </section>
    </main>
  );
}
