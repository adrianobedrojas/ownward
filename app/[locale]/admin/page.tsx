import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/admin/access";

function localePrefix(locale: string): string {
  return locale === "es" ? "/es" : "";
}

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const prefix = localePrefix(locale);
  const adminContext = await requirePlatformAdmin(undefined, {
    locale,
    nextPath: `${prefix}/admin`,
  });
  const admin = createAdminClient();

  const now = new Date();
  const overdueDate = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const recentResolvedDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    newContact,
    openSupport,
    overdueSupport,
    waitingOnUser,
    recentlyResolved,
    proPriority,
  ] = await Promise.all([
    admin
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    admin
      .from("support_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress", "waiting_on_internal"]),
    admin
      .from("support_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress", "waiting_on_internal"])
      .lt("last_activity_at", overdueDate),
    admin
      .from("support_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "waiting_on_user"),
    admin
      .from("support_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["resolved", "closed"])
      .gte("resolved_at", recentResolvedDate),
    admin
      .from("support_requests")
      .select("id", { count: "exact", head: true })
      .eq("plan_at_submission", "pro")
      .in("priority", ["high", "urgent"])
      .in("status", ["open", "in_progress", "waiting_on_user", "waiting_on_internal"]),
  ]);

  const metrics = [
    { label: locale === "es" ? "Nuevos contactos" : "New contact submissions", value: newContact.count ?? 0 },
    { label: locale === "es" ? "Solicitudes abiertas" : "Open support requests", value: openSupport.count ?? 0 },
    { label: locale === "es" ? "Solicitudes vencidas" : "Overdue requests", value: overdueSupport.count ?? 0 },
    { label: locale === "es" ? "En espera del usuario" : "Awaiting user response", value: waitingOnUser.count ?? 0 },
    { label: locale === "es" ? "Resueltas recientemente" : "Recently resolved", value: recentlyResolved.count ?? 0 },
    { label: locale === "es" ? "Prioridad Pro" : "Priority support (Pro)", value: proPriority.count ?? 0 },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-wider text-cyan-400">
          {locale === "es" ? "Centro administrativo" : "Admin Command Center"}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">
          {locale === "es" ? "Panel de soporte y contacto" : "Support and Contact Dashboard"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {locale === "es"
            ? `Rol actual: ${adminContext.role}`
            : `Current role: ${adminContext.role}`}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{metric.value}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Link
          href={`${prefix}/admin/contact`}
          className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-5 hover:bg-cyan-500/15"
        >
          <h2 className="text-lg font-semibold text-cyan-200">
            {locale === "es" ? "Contactos públicos" : "Public contact submissions"}
          </h2>
          <p className="mt-1 text-sm text-cyan-100/80">
            {locale === "es"
              ? "Revisa, asigna, convierte y archiva mensajes de contacto."
              : "Review, assign, convert, and archive contact messages."}
          </p>
        </Link>

        <Link
          href={`${prefix}/admin/support`}
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 hover:bg-emerald-500/15"
        >
          <h2 className="text-lg font-semibold text-emerald-200">
            {locale === "es" ? "Solicitudes de soporte" : "Support requests"}
          </h2>
          <p className="mt-1 text-sm text-emerald-100/80">
            {locale === "es"
              ? "Gestiona estados, prioridad, asignaciones y conversaciones."
              : "Manage statuses, priority, assignments, and request threads."}
          </p>
        </Link>
      </section>
    </main>
  );
}
