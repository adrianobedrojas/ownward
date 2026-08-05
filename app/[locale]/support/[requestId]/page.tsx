import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/require-user";
import { SUPPORT_MESSAGE_MAX } from "@/lib/support";
import { submitSupportReply } from "../actions";

function supportStatusLabel(t: Awaited<ReturnType<typeof getTranslations>>, status: string): string {
  const map: Record<string, string> = {
    submitted: t("status.submitted"),
    reviewing: t("status.reviewing"),
    awaiting_user: t("status.awaiting_user"),
    open: t("status.open"),
    in_progress: t("status.in_progress"),
    waiting_on_user: t("status.waiting_on_user"),
    waiting_on_internal: t("status.waiting_on_internal"),
    resolved: t("status.resolved"),
    closed: t("status.closed"),
    archived: t("status.archived"),
  };
  return map[status] ?? status;
}

export default async function SupportRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; requestId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { locale, requestId } = await params;
  const query = await searchParams;
  const t = await getTranslations({ locale, namespace: "Support" });
  const { user } = await requireUser();
  const admin = createAdminClient();

  const { data: request } = await admin
    .from("support_requests")
    .select("id, user_id, subject, status, category, priority, created_at, updated_at")
    .eq("id", requestId)
    .maybeSingle();

  if (!request || request.user_id !== user.id) {
    notFound();
  }

  const { data: messages } = await admin
    .from("support_request_messages")
    .select("id, message_type, is_internal, body, created_at, author_user_id, author_admin_id")
    .eq("request_id", requestId)
    .eq("is_internal", false)
    .order("created_at", { ascending: true });

  const canReply = request.status === "waiting_on_user";
  const errorMessage = query.error ? decodeURIComponent(query.error) : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href={`/${locale === "es" ? "es/" : ""}support`}
        className="text-sm text-cyan-300 hover:text-cyan-200"
      >
        {t("detail.back")}
      </Link>

      <header className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h1 className="text-2xl font-bold text-white">{request.subject}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {t("detail.requestId")}: <span className="font-mono">{request.id}</span>
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {t("detail.status")}: {supportStatusLabel(t, request.status)}
        </p>
      </header>

      {query.success ? (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {t("detail.replySuccess")}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-semibold text-white">{t("detail.thread")}</h2>
        <div className="mt-4 space-y-3">
          {(messages ?? []).map((message) => {
            const isCustomer = message.author_user_id === user.id;
            return (
              <article
                key={message.id}
                className={`rounded-lg border p-4 ${
                  isCustomer
                    ? "border-cyan-500/40 bg-cyan-500/10"
                    : "border-slate-700 bg-slate-800"
                }`}
              >
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {isCustomer ? t("detail.you") : t("detail.supportTeam")}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{message.body}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {new Date(message.created_at).toLocaleString(locale === "es" ? "es-US" : "en-US")}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-semibold text-white">{t("detail.reply")}</h2>
        {canReply ? (
          <form
            action={async (formData: FormData) => {
              "use server";
              const result = await submitSupportReply(formData);
              const { redirect } = await import("next/navigation");
              if (!result.success) {
                redirect(
                  `/${locale === "es" ? "es/" : ""}support/${requestId}?error=${encodeURIComponent(result.message)}`,
                );
              }
              redirect(`/${locale === "es" ? "es/" : ""}support/${requestId}?success=1`);
            }}
            className="mt-4 space-y-3"
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="request_id" value={requestId} />
            <textarea
              name="message"
              rows={5}
              maxLength={SUPPORT_MESSAGE_MAX}
              required
              placeholder={t("detail.replyPlaceholder")}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              {t("detail.sendReply")}
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-slate-400">{t("detail.replyDisabled")}</p>
        )}
      </section>
    </main>
  );
}
