import { requireUser } from "@/lib/require-user";
import { getUserBillingState } from "@/lib/billing";
import { createBusinessAction } from "../actions";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "New Business | Ownward",
};

export default async function NewBusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const billing = await getUserBillingState(supabase, user.id);
  const { businessLimit } = billing.entitlements;

  if (businessLimit === 0) {
    redirect("/pricing");
  }

  const { count } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .is("deleted_at", null);

  if ((count ?? 0) >= businessLimit) {
    redirect("/business?error=" + encodeURIComponent(`You have reached your ${businessLimit}-workspace limit. Upgrade to add more.`));
  }

  // Prefill name from profile if first creation
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name")
    .eq("id", user.id)
    .maybeSingle();

  const prefillName = (count ?? 0) === 0 ? (profile?.business_name ?? "") : "";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <Link href="/business" className="text-sm text-cyan-400 hover:text-cyan-300">
          ← Back to workspaces
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-white">Create Business Workspace</h1>
        <p className="mt-2 text-slate-400">
          Your business workspace connects to your milestones, health check, valuation, documents, and bookkeeping.
        </p>
      </div>

      {params.error && (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300 text-sm">
          {decodeURIComponent(params.error)}
        </div>
      )}

      <form action={createBusinessAction} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
            Business Name <span className="text-rose-400">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={prefillName}
            placeholder="e.g., Acme Consulting LLC"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
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
            placeholder="Brief description of your business..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-slate-300 mb-1">
              Industry
            </label>
            <input
              id="industry"
              name="industry"
              type="text"
              placeholder="e.g., Retail, SaaS, Services"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-slate-300 mb-1">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              placeholder="City, State"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="year_established" className="block text-sm font-medium text-slate-300 mb-1">
              Year Established
            </label>
            <input
              id="year_established"
              name="year_established"
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              placeholder="e.g., 2018"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="employee_count" className="block text-sm font-medium text-slate-300 mb-1">
              Number of Employees
            </label>
            <input
              id="employee_count"
              name="employee_count"
              type="number"
              min="0"
              placeholder="e.g., 5"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="business_stage" className="block text-sm font-medium text-slate-300 mb-1">
            Business Stage
          </label>
          <select
            id="business_stage"
            name="business_stage"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
          >
            <option value="">Select stage...</option>
            <option value="idea">Idea / Pre-launch</option>
            <option value="pre_revenue">Pre-revenue</option>
            <option value="early">Early stage</option>
            <option value="growth">Growth</option>
            <option value="established">Established</option>
            <option value="mature">Mature</option>
            <option value="exit_ready">Exit-ready</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="annual_revenue" className="block text-sm font-medium text-slate-300 mb-1">
              Annual Revenue ($)
            </label>
            <input
              id="annual_revenue"
              name="annual_revenue"
              type="number"
              min="0"
              step="1000"
              placeholder="e.g., 250000"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="owner_role" className="block text-sm font-medium text-slate-300 mb-1">
              Your Role
            </label>
            <input
              id="owner_role"
              name="owner_role"
              type="text"
              placeholder="e.g., Owner/Operator"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300 transition"
          >
            Create Workspace
          </button>
          <Link
            href="/business"
            className="text-sm text-slate-400 hover:text-slate-200 transition"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
