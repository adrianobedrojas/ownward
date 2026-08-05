import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/admin/access";
import {
  addContactInternalNote,
  archiveContactMessage,
  assignContactMessage,
  convertContactToSupportRequest,
  markContactReviewed,
  resolveContactMessage,
} from "./actions";

function localePrefix(locale: string): string {
  return locale === "es" ? "/es" : "";
}

export default async function AdminContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string; assignee?: string; from?: string; to?: string }>;
}) {
  const { locale } = await params;
  const prefix = localePrefix(locale);
  await requirePlatformAdmin(undefined, {
    locale,
    nextPath: `${prefix}/admin/contact`,
  });
  const filters = await searchParams;
  const admin = createAdminClient();

  const q = (filters.q ?? "").trim().toLowerCase();
  const status = (filters.status ?? "").trim();
  const assignee = (filters.assignee ?? "").trim();
  const from = (filters.from ?? "").trim();
  const to = (filters.to ?? "").trim();

  let query = admin
    .from("contact_messages")
    .select("id, user_id, name, email, subject, status, created_at, assigned_admin_id, signed_in, converted_support_request_id")
    .order("created_at", { ascending: false })
    .limit(300);

  if (status) query = query.eq("status", status);
  if (assignee) {
    if (assignee === "unassigned") query = query.is("assigned_admin_id", null);
    else query = query.eq("assigned_admin_id", assignee);
  }
  if (from) query = query.gte("created_at", new Date(from).toISOString());
  if (to) query = query.lte("created_at", new Date(to).toISOString());

  const { data: rowsRawData } = await query;
  const rowsRaw = rowsRawData ?? [];

  const userIds = [...new Set(rowsRaw.map((r) => r.user_id).filter(Boolean))] as string[];
  const [{ data: profiles = [] }, { data: admins = [] }] = await Promise.all([
    userIds.length > 0
      ? admin.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> }),
    admin.from("platform_admins").select("user_id, admin_role").eq("active", true),
  ]);
  const profileRows = profiles ?? [];
  const adminRows = admins ?? [];

  const profileMap = new Map(profileRows.map((p) => [p.id, p.full_name ?? ""]));
  const rows = rowsRaw.filter((row) => {
    if (!q) return true;
    const haystack = [
      row.id,
      row.name,
      row.email,
      row.subject ?? "",
      row.status,
      row.user_id ?? "",
      profileMap.get(row.user_id ?? "") ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wider text-cyan-400">
            {locale === "es" ? "Administración" : "Administration"}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">
            {locale === "es" ? "Mensajes de contacto" : "Contact messages"}
          </h1>
        </div>
        <Link href={`${prefix}/admin`} className="text-sm text-cyan-300 hover:text-cyan-200">
          {locale === "es" ? "Volver al panel" : "Back to dashboard"}
        </Link>
      </div>

      <form className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <input name="q" defaultValue={q} placeholder={locale === "es" ? "Buscar por correo, usuario, asunto, estado, ID" : "Search by email, user, subject, status, ID"} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white md:col-span-2" />
          <input name="status" defaultValue={status} placeholder={locale === "es" ? "Estado" : "Status"} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
          <select name="assignee" defaultValue={assignee} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white">
            <option value="">{locale === "es" ? "Asignado" : "Assignee"}</option>
            <option value="unassigned">{locale === "es" ? "Sin asignar" : "Unassigned"}</option>
            {adminRows.map((a) => (
              <option key={a.user_id} value={a.user_id}>{a.admin_role}</option>
            ))}
          </select>
          <input name="from" type="date" defaultValue={from} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
          <input name="to" type="date" defaultValue={to} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
        </div>
        <button type="submit" className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">{locale === "es" ? "Aplicar filtros" : "Apply filters"}</button>
      </form>

      <p className="mt-4 text-sm text-slate-400">{rows.length} {locale === "es" ? "resultados" : "results"}</p>

      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{row.subject || (locale === "es" ? "Sin asunto" : "No subject")}</p>
                <p className="text-xs text-slate-400">{row.name} · {row.email}</p>
                <p className="text-xs text-slate-500">{row.id}</p>
                <p className="text-xs text-slate-500">
                  {row.signed_in ? (locale === "es" ? "Con sesión" : "Signed in") : (locale === "es" ? "Visitante" : "Visitor")}
                  {row.user_id ? ` · ${profileMap.get(row.user_id) || row.user_id}` : ""}
                </p>
                {row.converted_support_request_id ? (
                  <p className="text-xs text-emerald-300">{locale === "es" ? "Convertido:" : "Converted:"} {row.converted_support_request_id}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <form action={markContactReviewed}>
                  <input type="hidden" name="message_id" value={row.id} />
                  <button type="submit" className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200">{locale === "es" ? "Revisar" : "Mark reviewed"}</button>
                </form>
                <form action={resolveContactMessage}>
                  <input type="hidden" name="message_id" value={row.id} />
                  <button type="submit" className="rounded-md border border-emerald-700 px-2 py-1 text-xs text-emerald-300">{locale === "es" ? "Resolver" : "Resolve"}</button>
                </form>
                <form action={archiveContactMessage}>
                  <input type="hidden" name="message_id" value={row.id} />
                  <button type="submit" className="rounded-md border border-amber-700 px-2 py-1 text-xs text-amber-300">{locale === "es" ? "Archivar" : "Archive"}</button>
                </form>
                <form action={convertContactToSupportRequest}>
                  <input type="hidden" name="message_id" value={row.id} />
                  <button type="submit" className="rounded-md border border-cyan-700 px-2 py-1 text-xs text-cyan-300">{locale === "es" ? "Convertir" : "Convert"}</button>
                </form>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <form action={assignContactMessage} className="flex gap-2">
                <input type="hidden" name="message_id" value={row.id} />
                <select name="assigned_admin_id" defaultValue={row.assigned_admin_id ?? ""} className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white">
                  <option value="">{locale === "es" ? "Sin asignar" : "Unassigned"}</option>
                  {adminRows.map((a) => (
                    <option key={a.user_id} value={a.user_id}>{a.admin_role}</option>
                  ))}
                </select>
                <button type="submit" className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300">OK</button>
              </form>

              <form action={addContactInternalNote} className="flex gap-2">
                <input type="hidden" name="message_id" value={row.id} />
                <input name="note" placeholder={locale === "es" ? "Nota interna" : "Internal note"} className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white" />
                <button type="submit" className="rounded-md bg-slate-700 px-2 py-1 text-xs text-slate-200">{locale === "es" ? "Guardar" : "Save"}</button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
