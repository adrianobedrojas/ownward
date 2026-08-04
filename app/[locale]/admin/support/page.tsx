import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/admin/access";
import {
  SUPPORT_CATEGORY_VALUES,
  SUPPORT_PRIORITY_VALUES,
  SUPPORT_STATUS_VALUES,
} from "@/lib/support";
import {
  assignSupportRequest,
  updateSupportPriority,
  updateSupportStatus,
} from "./actions";

function localePrefix(locale: string): string {
  return locale === "es" ? "/es" : "";
}

export default async function AdminSupportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    priority?: string;
    plan?: string;
    assignee?: string;
    category?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { locale } = await params;
  const prefix = localePrefix(locale);
  await requirePlatformAdmin(undefined, {
    locale,
    nextPath: `${prefix}/admin/support`,
  });
  const filters = await searchParams;
  const admin = createAdminClient();

  const q = (filters.q ?? "").trim().toLowerCase();
  const priority = (filters.priority ?? "").trim();
  const plan = (filters.plan ?? "").trim();
  const assignee = (filters.assignee ?? "").trim();
  const category = (filters.category ?? "").trim();
  const status = (filters.status ?? "").trim();
  const from = (filters.from ?? "").trim();
  const to = (filters.to ?? "").trim();

  let query = admin
    .from("support_requests")
    .select("id, user_id, subject, category, status, priority, plan_at_submission, assigned_admin_id, created_at, last_activity_at")
    .order("created_at", { ascending: false })
    .limit(300);

  if (priority && SUPPORT_PRIORITY_VALUES.includes(priority as never)) {
    query = query.eq("priority", priority);
  }
  if (status && SUPPORT_STATUS_VALUES.includes(status as never)) {
    query = query.eq("status", status);
  }
  if (plan) {
    query = query.eq("plan_at_submission", plan);
  }
  if (assignee) {
    if (assignee === "unassigned") {
      query = query.is("assigned_admin_id", null);
    } else {
      query = query.eq("assigned_admin_id", assignee);
    }
  }
  if (category && SUPPORT_CATEGORY_VALUES.includes(category as never)) {
    query = query.eq("category", category);
  }
  if (from) {
    query = query.gte("created_at", new Date(from).toISOString());
  }
  if (to) {
    query = query.lte("created_at", new Date(to).toISOString());
  }

  const { data: requestsRawData } = await query;
  const requestsRaw = requestsRawData ?? [];

  const userIds = [...new Set(requestsRaw.map((item) => item.user_id).filter(Boolean))] as string[];

  const [profileRes, adminsRes] = await Promise.all([
    userIds.length > 0
      ? admin.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> }),
    admin.from("platform_admins").select("user_id, admin_role, active").eq("active", true),
  ]);

  const profileMap = new Map((profileRes.data ?? []).map((p) => [p.id, p.full_name ?? ""]));
  const activeAdmins = adminsRes.data ?? [];
  const emailEntries = await Promise.all(
    userIds.map(async (userId) => {
      const { data } = await admin.auth.admin.getUserById(userId);
      return [userId, data.user?.email ?? ""] as const;
    })
  );
  const emailMap = new Map(emailEntries);

  const requests = requestsRaw.filter((item) => {
    if (!q) return true;

    const target = [
      item.id,
      item.user_id,
      item.subject,
      item.category,
      item.status,
      item.priority,
      item.plan_at_submission,
      profileMap.get(item.user_id) ?? "",
      emailMap.get(item.user_id) ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return target.includes(q);
  });

  const statusOptions = [...SUPPORT_STATUS_VALUES];
  const priorityOptions = [...SUPPORT_PRIORITY_VALUES];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wider text-emerald-400">
            {locale === "es" ? "Administración" : "Administration"}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">
            {locale === "es" ? "Solicitudes de soporte" : "Support requests"}
          </h1>
        </div>
        <Link href={`${prefix}/admin`} className="text-sm text-cyan-300 hover:text-cyan-200">
          {locale === "es" ? "Volver al panel" : "Back to dashboard"}
        </Link>
      </div>

      <form className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          <input
            name="q"
            defaultValue={q}
            placeholder={locale === "es" ? "Buscar por correo, usuario, asunto, estado, ID" : "Search by email, user, subject, status, ID"}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white md:col-span-2"
          />
          <select name="priority" defaultValue={priority} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white">
            <option value="">{locale === "es" ? "Prioridad" : "Priority"}</option>
            {priorityOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <input name="plan" defaultValue={plan} placeholder={locale === "es" ? "Plan" : "Plan"} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
          <select name="assignee" defaultValue={assignee} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white">
            <option value="">{locale === "es" ? "Asignado" : "Assignee"}</option>
            <option value="unassigned">{locale === "es" ? "Sin asignar" : "Unassigned"}</option>
            {activeAdmins.map((adminRow) => (
              <option key={adminRow.user_id} value={adminRow.user_id}>{adminRow.admin_role} · {adminRow.user_id.slice(0, 8)}</option>
            ))}
          </select>
          <select name="category" defaultValue={category} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white">
            <option value="">{locale === "es" ? "Categoría" : "Category"}</option>
            {SUPPORT_CATEGORY_VALUES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select name="status" defaultValue={status} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white">
            <option value="">{locale === "es" ? "Estado" : "Status"}</option>
            {statusOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>

        <div className="mt-3 flex gap-3">
          <input name="from" type="date" defaultValue={from} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
          <input name="to" type="date" defaultValue={to} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
          <button type="submit" className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300">
            {locale === "es" ? "Aplicar filtros" : "Apply filters"}
          </button>
        </div>
      </form>

      <p className="mt-4 text-sm text-slate-400">{requests.length} {locale === "es" ? "resultados" : "results"}</p>

      <div className="mt-4 space-y-3">
        {requests.map((request) => (
          <article key={request.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`${prefix}/admin/support/${request.id}`} className="text-base font-semibold text-white hover:text-cyan-300">
                  {request.subject}
                </Link>
                <p className="mt-1 text-xs text-slate-500">{request.id}</p>
                <p className="text-xs text-slate-500">
                  {profileMap.get(request.user_id) || request.user_id} · {request.plan_at_submission ?? "free"}
                </p>
                <p className="text-xs text-slate-500">{emailMap.get(request.user_id) ?? ""}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <form action={updateSupportStatus}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <div className="flex items-center gap-1">
                  <select name="status" defaultValue={request.status} className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white">
                    {statusOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <button type="submit" className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300">OK</button>
                  </div>
                </form>

                <form action={updateSupportPriority}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <div className="flex items-center gap-1">
                  <select name="priority" defaultValue={request.priority} className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white">
                    {priorityOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <button type="submit" className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300">OK</button>
                  </div>
                </form>

                <form action={assignSupportRequest}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <div className="flex items-center gap-1">
                  <select name="assigned_admin_id" defaultValue={request.assigned_admin_id ?? ""} className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white">
                    <option value="">{locale === "es" ? "Sin asignar" : "Unassigned"}</option>
                    {activeAdmins.map((adminRow) => (
                      <option key={adminRow.user_id} value={adminRow.user_id}>{adminRow.admin_role}</option>
                    ))}
                  </select>
                  <button type="submit" className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300">OK</button>
                  </div>
                </form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
