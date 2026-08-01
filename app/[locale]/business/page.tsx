import { requireUser } from "@/lib/require-user";
import { getUserBillingState } from "@/lib/billing";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Passport | Ownward",
  description: "Manage your business workspaces.",
};

export default async function BusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();

  const billing = await getUserBillingState(supabase, user.id);
  const { businessLimit, bookkeeping } = billing.entitlements;

  // Fetch active businesses for this user (not deleted)
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, description, industry, location, profile_completion, created_at")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_business_id, business_name")
    .eq("id", user.id)
    .maybeSingle();

  const activeBusinessId = profile?.active_business_id;
  const canCreate = businessLimit > 0 && (businesses?.length ?? 0) < businessLimit;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Business Passport
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">Your Business Workspaces</h1>
          <p className="mt-2 text-slate-300">
            {billing.plan === "free"
              ? "Upgrade to a Starter plan to create a business workspace."
              : `${businesses?.length ?? 0} of ${businessLimit} workspace${businessLimit === 1 ? "" : "s"} used`}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/business/new"
            className="inline-flex items-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300 transition"
          >
            + New Business
          </Link>
        )}
        {!canCreate && billing.plan === "free" && (
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300 transition"
          >
            Upgrade to Get Started
          </Link>
        )}
      </div>

      {/* Status banners */}
      {params.created === "1" && (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
          Business workspace created successfully!
        </div>
      )}
      {params.error && (
        <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
          {decodeURIComponent(params.error)}
        </div>
      )}

      {/* Workspace list */}
      {!businesses || businesses.length === 0 ? (
        <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
          <p className="text-slate-400">No business workspaces yet.</p>
          {billing.plan === "free" ? (
            <Link
              href="/pricing"
              className="mt-4 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/10 transition"
            >
              Upgrade to Starter
            </Link>
          ) : (
            <Link
              href="/business/new"
              className="mt-4 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/10 transition"
            >
              Create Your First Business
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {businesses.map((biz) => {
            const isActive = biz.id === activeBusinessId;
            return (
              <div
                key={biz.id}
                className={`rounded-xl border p-6 flex flex-col gap-3 ${
                  isActive
                    ? "border-cyan-400/50 bg-slate-900"
                    : "border-slate-800 bg-slate-900/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-white">{biz.name}</h2>
                    {biz.industry && (
                      <p className="text-xs text-slate-400 mt-0.5">{biz.industry}</p>
                    )}
                    {biz.location && (
                      <p className="text-xs text-slate-500">{biz.location}</p>
                    )}
                  </div>
                  {isActive && (
                    <span className="shrink-0 rounded-full bg-cyan-400/15 px-2 py-0.5 text-xs font-semibold text-cyan-400">
                      Active
                    </span>
                  )}
                </div>

                {/* Completion bar */}
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Profile completion</span>
                    <span>{biz.profile_completion ?? 0}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{ width: `${biz.profile_completion ?? 0}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Link
                    href={`/business/${biz.id}`}
                    className="text-sm font-semibold text-cyan-300 hover:text-cyan-200 transition"
                  >
                    View / Edit →
                  </Link>
                  {!isActive && (
                    <form
                      action={async () => {
                        "use server";
                        const { setActiveBusiness } = await import("./actions");
                        await setActiveBusiness(biz.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-xs text-slate-400 hover:text-slate-200 transition"
                      >
                        Set as active
                      </button>
                    </form>
                  )}
                  {bookkeeping && (
                    <Link
                      href="/money"
                      className="text-xs text-slate-400 hover:text-slate-200 transition"
                    >
                      Bookkeeping
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Limit reached notice */}
      {!canCreate && billing.plan !== "free" && (businesses?.length ?? 0) >= businessLimit && (
        <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-300 text-sm">
          You have reached your {businessLimit}-workspace limit.{" "}
          <Link href="/pricing" className="underline hover:text-amber-200">
            Upgrade your plan
          </Link>{" "}
          to add more.
        </div>
      )}
    </main>
  );
}
