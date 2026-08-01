import { requireUser } from "@/lib/require-user";
import { getUserBillingState } from "@/lib/billing";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Milestone Trail | Ownward",
  description: "Track your business milestones.",
};

const CATEGORY_LABELS: Record<string, string> = {
  formation: "Formation",
  finance: "Finance",
  customer: "Customers",
  operations: "Operations",
  marketing: "Marketing",
  team: "Team",
  growth: "Growth",
  sale_readiness: "Sale Readiness",
  custom: "Custom",
};

const STATUS_STYLES: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  planned: { label: "Planned", bg: "bg-slate-800", text: "text-slate-400" },
  in_progress: {
    label: "In Progress",
    bg: "bg-cyan-400/10",
    text: "text-cyan-300",
  },
  completed: {
    label: "Completed",
    bg: "bg-emerald-400/10",
    text: "text-emerald-400",
  },
  paused: { label: "Paused", bg: "bg-amber-400/10", text: "text-amber-400" },
};

export default async function MilestonesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string; business?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();

  const billing = await getUserBillingState(supabase, user.id);
  const { milestoneMonthlyLimit } = billing.entitlements;

  if (milestoneMonthlyLimit === 0) {
    redirect("/pricing?feature=milestones");
  }

  // Get active business
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_business_id")
    .eq("id", user.id)
    .maybeSingle();

  const activeBizId = params.business ?? profile?.active_business_id ?? null;

  // Get businesses
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!businesses || businesses.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold text-white">Milestone Trail</h1>
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
          <p className="text-slate-400">You need a business workspace to track milestones.</p>
          <Link
            href="/business/new"
            className="mt-4 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/10 transition"
          >
            Create Business Workspace
          </Link>
        </div>
      </main>
    );
  }

  // Monthly usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: usedThisMonth } = await supabase
    .from("business_milestones")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth.toISOString());

  const monthlyUsed = usedThisMonth ?? 0;
  const canCreate = monthlyUsed < milestoneMonthlyLimit;

  // Fetch milestones
  let query = supabase
    .from("business_milestones")
    .select("id, title, description, category, status, target_date, milestone_date, completed_at, created_at, business_id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (activeBizId) {
    query = query.eq("business_id", activeBizId);
  }
  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.category) {
    query = query.eq("category", params.category);
  }

  const { data: milestones } = await query;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Milestone Trail
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">Business Milestones</h1>
        </div>
      </div>

      {/* Usage meter */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-slate-800 max-w-xs">
          <div
            className={`h-full rounded-full transition-all ${
              monthlyUsed >= milestoneMonthlyLimit ? "bg-rose-500" : "bg-cyan-400"
            }`}
            style={{
              width: `${Math.min(100, (monthlyUsed / milestoneMonthlyLimit) * 100)}%`,
            }}
          />
        </div>
        <span className="text-sm text-slate-400">
          {monthlyUsed} of {milestoneMonthlyLimit} milestones this month
        </span>
        {!canCreate && (
          <Link href="/pricing" className="text-xs text-cyan-400 hover:text-cyan-300 underline">
            Upgrade
          </Link>
        )}
      </div>

      {/* Business selector */}
      {businesses.length > 1 && (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">Business:</span>
          {businesses.map((b) => (
            <Link
              key={b.id}
              href={`/milestones?business=${b.id}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activeBizId === b.id
                  ? "bg-cyan-400 text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {b.name}
            </Link>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400">Filter:</span>
        {["planned", "in_progress", "completed", "paused"].map((s) => (
          <Link
            key={s}
            href={`/milestones?${activeBizId ? `business=${activeBizId}&` : ""}status=${s}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              params.status === s
                ? "bg-cyan-400 text-slate-950"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {STATUS_STYLES[s]?.label ?? s}
          </Link>
        ))}
        {params.status && (
          <Link
            href={`/milestones${activeBizId ? `?business=${activeBizId}` : ""}`}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Clear
          </Link>
        )}
      </div>

      {/* Add milestone form */}
      {canCreate && activeBizId && (
        <form
          action={async (formData: FormData) => {
            "use server";
            const { createMilestone } = await import("./actions");
            await createMilestone(formData);
          }}
          className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-white">Add Milestone</h2>
          <input type="hidden" name="business_id" value={activeBizId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <input
                name="title"
                type="text"
                required
                placeholder="Milestone title..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <select
              name="category"
              defaultValue="custom"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
            >
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select
              name="status"
              defaultValue="planned"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
            </select>
            <input
              name="target_date"
              type="date"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 transition"
          >
            Add Milestone
          </button>
        </form>
      )}

      {!canCreate && (
        <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-300 text-sm">
          You have used all {milestoneMonthlyLimit} milestones for this month.{" "}
          <Link href="/pricing" className="underline hover:text-amber-200">
            Upgrade your plan
          </Link>{" "}
          to create more, or wait until next month.
        </div>
      )}

      {!activeBizId && (
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-400 text-sm">
          Select a business workspace above to add milestones.{" "}
          <Link href="/business" className="text-cyan-400 hover:text-cyan-300">
            Go to workspaces →
          </Link>
        </div>
      )}

      {/* Timeline */}
      <div className="mt-8 space-y-4">
        {(!milestones || milestones.length === 0) ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
            <p className="text-slate-400">No milestones yet.</p>
            <p className="text-sm text-slate-500 mt-2">
              Add your first milestone above to start tracking your progress.
            </p>
          </div>
        ) : (
          milestones.map((m) => {
            const s = STATUS_STYLES[m.status] ?? STATUS_STYLES.planned;
            return (
              <article
                key={m.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}
                      >
                        {s.label}
                      </span>
                      <span className="text-xs text-slate-500">
                        {CATEGORY_LABELS[m.category] ?? m.category}
                      </span>
                      {m.target_date && (
                        <span className="text-xs text-slate-500">
                          Target: {new Date(m.target_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-semibold text-white">{m.title}</h3>
                    {m.description && (
                      <p className="mt-1 text-sm text-slate-400">{m.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {m.status !== "completed" ? (
                      <form
                        action={async () => {
                          "use server";
                          const { completeMilestone } = await import("./actions");
                          await completeMilestone(m.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                        >
                          Complete
                        </button>
                      </form>
                    ) : (
                      <form
                        action={async () => {
                          "use server";
                          const { reopenMilestone } = await import("./actions");
                          await reopenMilestone(m.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                        >
                          Reopen
                        </button>
                      </form>
                    )}
                    <form
                      action={async () => {
                        "use server";
                        const { deleteMilestone } = await import("./actions");
                        await deleteMilestone(m.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </main>
  );
}
