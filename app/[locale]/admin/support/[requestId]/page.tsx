import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/admin/access";
import { SUPPORT_MESSAGE_MAX } from "@/lib/support";
import { addSupportMessage } from "../actions";

function localePrefix(locale: string): string {
  return locale === "es" ? "/es" : "";
}

export default async function AdminSupportRequestDetailPage({
  params,
}: {
  params: Promise<{ locale: string; requestId: string }>;
}) {
  const { locale, requestId } = await params;
  const prefix = localePrefix(locale);
  await requirePlatformAdmin(undefined, {
    locale,
    nextPath: `${prefix}/admin/support/${requestId}`,
  });
  const admin = createAdminClient();

  const [{ data: request }, { data: messages = [] }, { data: events = [] }] = await Promise.all([
    admin
      .from("support_requests")
      .select("id, user_id, subject, message, category, status, priority, assigned_admin_id, plan_at_submission, created_at, updated_at")
      .eq("id", requestId)
      .maybeSingle(),
    admin
      .from("support_request_messages")
      .select("id, message_type, is_internal, body, created_at, author_user_id, author_admin_id")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true }),
    admin
      .from("support_request_events")
      .select("id, event_type, metadata, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!request) {
    notFound();
  }

  const messageRows = messages ?? [];
  const eventRows = events ?? [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">{request.subject}</h1>
        <Link href={`${prefix}/admin/support`} className="text-sm text-cyan-300 hover:text-cyan-200">
          {locale === "es" ? "Volver" : "Back"}
        </Link>
      </div>

      <p className="mt-2 text-xs text-slate-500">{request.id} · {request.status} · {request.priority}</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white">{locale === "es" ? "Conversación" : "Thread"}</h2>
          <div className="mt-4 space-y-3">
            {messageRows.map((message) => (
              <article key={message.id} className={`rounded-lg border p-4 ${message.is_internal ? "border-amber-700/40 bg-amber-950/20" : "border-slate-700 bg-slate-800"}`}>
                <p className="text-xs uppercase tracking-wide text-slate-400">{message.message_type}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{message.body}</p>
                <p className="mt-2 text-xs text-slate-500">{new Date(message.created_at).toLocaleString(locale === "es" ? "es-US" : "en-US")}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <form action={addSupportMessage} className="space-y-2 rounded-lg border border-slate-700 bg-slate-800 p-3">
              <input type="hidden" name="request_id" value={requestId} />
              <input type="hidden" name="message_type" value="admin_reply" />
              <label className="text-xs text-slate-400">{locale === "es" ? "Respuesta pública" : "Public reply"}</label>
              <textarea name="body" rows={4} maxLength={SUPPORT_MESSAGE_MAX} required className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white" />
              <button type="submit" className="rounded-md bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-300">{locale === "es" ? "Enviar" : "Send"}</button>
            </form>

            <form action={addSupportMessage} className="space-y-2 rounded-lg border border-slate-700 bg-slate-800 p-3">
              <input type="hidden" name="request_id" value={requestId} />
              <input type="hidden" name="message_type" value="internal_note" />
              <label className="text-xs text-slate-400">{locale === "es" ? "Nota interna" : "Internal note"}</label>
              <textarea name="body" rows={4} maxLength={SUPPORT_MESSAGE_MAX} required className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white" />
              <button type="submit" className="rounded-md bg-amber-300 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-200">{locale === "es" ? "Guardar" : "Save"}</button>
            </form>
          </div>
        </section>

        <aside className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold text-white">{locale === "es" ? "Auditoría" : "Audit"}</h2>
          <div className="mt-3 space-y-2">
            {eventRows.map((event) => (
              <div key={event.id} className="rounded-md border border-slate-700 bg-slate-800 p-2">
                <p className="text-xs font-semibold text-slate-200">{event.event_type}</p>
                <p className="text-[11px] text-slate-500">{new Date(event.created_at).toLocaleString(locale === "es" ? "es-US" : "en-US")}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
