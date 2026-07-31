import { requireUser } from "@/lib/require-user";
import { getUserBillingState } from "@/lib/billing";
import { submitSupportRequest } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support | Ownward",
  description: "Get help with your Ownward account.",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  reviewing: "Under Review",
  awaiting_user: "Awaiting Your Response",
  resolved: "Resolved",
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();

  const billing = await getUserBillingState(supabase, user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const prefillName = (profile as { full_name?: string } | null)?.full_name ?? "";
  const prefillEmail = user.email ?? "";

  // Fetch own support requests
  const { data: requests } = await supabase
    .from("support_requests")
    .select("id, subject, status, created_at, plan_at_submission")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const supportTier =
    billing.plan === "pro"
      ? "Priority Support"
      : billing.plan === "starter" || billing.plan === "builder"
      ? "Standard Support"
      : "General Contact";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          {supportTier}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">Support</h1>
        <p className="mt-2 text-slate-400">
          {billing.plan === "free"
            ? "Submit a general enquiry below."
            : `You are on the ${billing.plan} plan — ${supportTier}.`}
        </p>
      </div>

      {params.success && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300 text-sm">
          Request submitted. Your request ID is:{" "}
          <code className="font-mono text-emerald-200 text-xs">{params.success}</code>
        </div>
      )}

      {/* Request form */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-5">Submit a Request</h2>
        <form
          action={async (formData: FormData) => {
            "use server";
            const result = await submitSupportRequest(formData);
            const { redirect } = await import("next/navigation");
            if (result.success) {
              redirect(`/support?success=${encodeURIComponent(result.requestId)}`);
            }
            redirect("/support?error=1");
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Name
              </label>
              <input
                name="name"
                type="text"
                defaultValue={prefillName}
                readOnly={!!prefillName}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none read-only:opacity-60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Email
              </label>
              <input
                name="email"
                type="email"
                defaultValue={prefillEmail}
                readOnly={!!prefillEmail}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none read-only:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Category
            </label>
            <select
              name="category"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="">Select category...</option>
              <option value="billing">Billing &amp; Subscription</option>
              <option value="technical">Technical Issue</option>
              <option value="feature">Feature Request</option>
              <option value="account">Account &amp; Access</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Subject <span className="text-rose-400">*</span>
            </label>
            <input
              name="subject"
              type="text"
              required
              placeholder="Brief summary of your request..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Message <span className="text-rose-400">*</span>
            </label>
            <textarea
              name="message"
              rows={5}
              required
              placeholder="Describe your issue or question in detail..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300 transition"
          >
            Submit Request
          </button>
        </form>
      </section>

      {/* Previous requests */}
      {requests && requests.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Your Requests</h2>
          <div className="space-y-3">
            {requests.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-white">{r.subject}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString()} ·{" "}
                      <span className="capitalize">{r.plan_at_submission ?? "free"}</span> plan
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.status === "resolved"
                        ? "bg-emerald-400/10 text-emerald-400"
                        : r.status === "reviewing"
                        ? "bg-cyan-400/10 text-cyan-400"
                        : r.status === "awaiting_user"
                        ? "bg-amber-400/10 text-amber-400"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 font-mono">
                  ID: {r.id}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
