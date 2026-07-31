import { requireUser } from "@/lib/require-user";
import { updateBusinessAction } from "../actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Profile | Ownward",
};

export default async function BusinessDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const { businessId } = await params;
  const qp = await searchParams;
  const { supabase, user } = await requireUser();

  const { data: biz } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!biz) notFound();

  const STAGE_LABELS: Record<string, string> = {
    idea: "Idea / Pre-launch",
    pre_revenue: "Pre-revenue",
    early: "Early stage",
    growth: "Growth",
    established: "Established",
    mature: "Mature",
    exit_ready: "Exit-ready",
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <Link href="/business" className="text-sm text-cyan-400 hover:text-cyan-300">
          ← Back to workspaces
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-white">{biz.name}</h1>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-400"
                style={{ width: `${biz.profile_completion ?? 0}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">{biz.profile_completion ?? 0}% complete</span>
          </div>
        </div>
      </div>

      {qp.updated === "1" && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300 text-sm">
          Business profile updated successfully.
        </div>
      )}
      {qp.error && (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300 text-sm">
          {decodeURIComponent(qp.error)}
        </div>
      )}

      <form action={updateBusinessAction} className="space-y-5">
        <input type="hidden" name="business_id" value={biz.id} />

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
            Business Name <span className="text-rose-400">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={biz.name}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={biz.description ?? ""}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-slate-300 mb-1">Industry</label>
            <input
              id="industry"
              name="industry"
              type="text"
              defaultValue={biz.industry ?? ""}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-slate-300 mb-1">Location</label>
            <input
              id="location"
              name="location"
              type="text"
              defaultValue={biz.location ?? ""}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-slate-300 mb-1">Website</label>
            <input
              id="website"
              name="website"
              type="url"
              defaultValue={biz.website ?? ""}
              placeholder="https://"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="year_established" className="block text-sm font-medium text-slate-300 mb-1">Year Established</label>
            <input
              id="year_established"
              name="year_established"
              type="number"
              defaultValue={biz.year_established ?? ""}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="business_stage" className="block text-sm font-medium text-slate-300 mb-1">Business Stage</label>
          <select
            id="business_stage"
            name="business_stage"
            defaultValue={biz.business_stage ?? ""}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
          >
            <option value="">Select stage...</option>
            {Object.entries(STAGE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="employee_count" className="block text-sm font-medium text-slate-300 mb-1">Employees</label>
            <input
              id="employee_count"
              name="employee_count"
              type="number"
              min="0"
              defaultValue={biz.employee_count ?? ""}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="annual_revenue" className="block text-sm font-medium text-slate-300 mb-1">Annual Revenue ($)</label>
            <input
              id="annual_revenue"
              name="annual_revenue"
              type="number"
              min="0"
              defaultValue={biz.annual_revenue ?? ""}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="owner_role" className="block text-sm font-medium text-slate-300 mb-1">Your Role</label>
            <input
              id="owner_role"
              name="owner_role"
              type="text"
              defaultValue={biz.owner_role ?? ""}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="primary_customer" className="block text-sm font-medium text-slate-300 mb-1">Primary Customer</label>
            <input
              id="primary_customer"
              name="primary_customer"
              type="text"
              defaultValue={biz.primary_customer ?? ""}
              placeholder="e.g., SMBs, consumers..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300 transition"
          >
            Save Changes
          </button>
          <Link href="/business" className="text-sm text-slate-400 hover:text-slate-200 transition">
            Cancel
          </Link>
        </div>
      </form>

      {/* Quick links */}
      <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Connected Tools
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { href: "/milestones", label: "Milestones" },
            { href: "/health", label: "Health Check" },
            { href: "/valuation", label: "Valuation" },
            { href: "/documents", label: "Documents" },
            { href: "/money", label: "Bookkeeping" },
            { href: "/support", label: "Support" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 text-center hover:border-cyan-400/50 hover:text-cyan-300 transition"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
