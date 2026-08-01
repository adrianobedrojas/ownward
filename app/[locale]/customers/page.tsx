// app/customers/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import { getUserBillingState } from "@/lib/billing";
import { createLead, archiveContact, convertLeadToCustomer } from "./actions";

export const metadata: Metadata = {
  title: "CRM | Ownward Hub",
  description: "Track your leads, clients, and follow-ups.",
};

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const STAGE_COLORS: Record<string, string> = {
  new: "bg-slate-700 text-slate-300",
  contacted: "bg-blue-900 text-blue-300",
  qualified: "bg-indigo-900 text-indigo-300",
  proposal: "bg-yellow-900 text-yellow-300",
  negotiation: "bg-orange-900 text-orange-300",
  won: "bg-green-900 text-green-300",
  lost: "bg-red-900 text-red-300",
};

interface SearchParams {
  error?: string;
  success?: string;
  message?: string;
  filter?: string;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const billing = await getUserBillingState(supabase, user.id);

  const canWrite = billing.entitlements.leadLimit > 0;
  const leadLimit = billing.entitlements.leadLimit;

  // Active leads (non-deleted, record_type = lead)
  const { data: activeLeads, count: activeLeadCount } = await supabase
    .from("crm_contacts")
    .select("id, name, company, email, stage, estimated_value, next_follow_up_at, created_at, record_type", { count: "exact" })
    .eq("owner_user_id", user.id)
    .eq("record_type", "lead")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  // Customers (converted)
  const { data: customers, count: customerCount } = await supabase
    .from("crm_contacts")
    .select("id, name, company, email, stage, estimated_value, next_follow_up_at, created_at, record_type", { count: "exact" })
    .eq("owner_user_id", user.id)
    .eq("record_type", "customer")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  // Follow-ups due today or overdue
  const todayIso = new Date().toISOString();
  const overdueFollowUps = (activeLeads ?? []).filter(
    (l) => l.next_follow_up_at && l.next_follow_up_at <= todayIso
  );

  // Pipeline value (sum of estimated_value for active leads)
  const pipelineValue = (activeLeads ?? []).reduce(
    (sum, l) => sum + Number(l.estimated_value ?? 0),
    0
  );

  const filter = params.filter ?? "leads";

  const showSuccess = params.success;
  const errorMessage =
    params.error === "LeadLimitReached"
      ? (params.message ?? `You've reached your ${leadLimit}-lead limit. Archive some leads or upgrade your plan.`)
      : params.error === "UpgradeRequired"
        ? "CRM requires a Builder or higher plan."
        : params.error
          ? "Something went wrong. Please try again."
          : null;

  const viewItems = filter === "customers" ? (customers ?? []) : (activeLeads ?? []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Ownward Hub CRM
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">Leads & Customers</h1>
          <p className="mt-2 text-slate-400">
            Organize leads, clients, and follow-ups.
          </p>
        </div>

        {canWrite ? (
          <button
            type="button"
            className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
            onClick={undefined}
            aria-label="Add lead (open form below)"
          >
            + Add Lead
          </button>
        ) : (
          <Link
            href="/pricing"
            className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Upgrade to Use CRM
          </Link>
        )}
      </div>

      {/* Status messages */}
      {showSuccess && (
        <div className="mt-4 rounded-lg bg-green-900/40 border border-green-700 px-4 py-3 text-green-300 text-sm">
          {showSuccess === "LeadCreated" && "Lead added successfully."}
          {showSuccess === "LeadConverted" && "Lead converted to customer."}
          {showSuccess === "ContactUpdated" && "Contact updated."}
          {showSuccess === "Archived" && "Contact archived."}
          {showSuccess === "Restored" && "Contact restored."}
        </div>
      )}
      {errorMessage && (
        <div className="mt-4 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-red-300 text-sm">
          {errorMessage}
          {(params.error === "UpgradeRequired" || params.error === "LeadLimitReached") && (
            <Link href="/pricing" className="ml-2 underline text-cyan-400">
              View plans →
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Active Leads</p>
          <p className="mt-2 text-3xl font-bold text-white">{activeLeadCount ?? 0}</p>
          {leadLimit > 0 && (
            <p className="text-xs text-slate-500 mt-1">of {leadLimit} limit</p>
          )}
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Customers</p>
          <p className="mt-2 text-3xl font-bold text-white">{customerCount ?? 0}</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Follow-ups Due</p>
          <p className="mt-2 text-3xl font-bold text-white">{overdueFollowUps.length}</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Pipeline Value</p>
          <p className="mt-2 text-3xl font-bold text-white">
            ${pipelineValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
        </article>
      </div>

      {/* Add lead form (Builder+) */}
      {canWrite && (
        <details className="mt-8 rounded-xl border border-slate-800 bg-slate-900">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-white hover:text-cyan-400 list-none flex items-center gap-2">
            <span className="text-cyan-400">+</span> Add New Lead
          </summary>
          <form action={createLead} className="px-5 pb-5 pt-2 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name *</label>
              <input
                name="name"
                required
                maxLength={200}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Company</label>
              <input
                name="company"
                maxLength={200}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email</label>
              <input
                name="email"
                type="email"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Phone</label>
              <input
                name="phone"
                type="tel"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="+1 555 000 0000"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Stage</label>
              <select
                name="stage"
                defaultValue="new"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {Object.entries(STAGE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Estimated Value ($)</label>
              <input
                name="estimated_value"
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Source</label>
              <input
                name="source"
                maxLength={100}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="Referral, website, cold outreach…"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Notes</label>
              <input
                name="notes"
                maxLength={1000}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="Any notes…"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Add Lead
              </button>
            </div>
          </form>
        </details>
      )}

      {/* Upgrade CTA for non-Builder users */}
      {!canWrite && (
        <div className="mt-8 rounded-xl border border-dashed border-cyan-700 bg-cyan-400/5 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold text-white">CRM requires Builder or higher</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-400">
            Track up to 100 active leads, manage stages, and monitor follow-ups with the Builder plan.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-flex items-center rounded-lg bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
          >
            View Builder Plan →
          </Link>
        </div>
      )}

      {/* Tabs */}
      {canWrite && (
        <>
          <div className="mt-8 flex gap-2">
            <Link
              href="/customers?filter=leads"
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                filter !== "customers"
                  ? "bg-cyan-400 text-slate-950"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Leads ({activeLeadCount ?? 0})
            </Link>
            <Link
              href="/customers?filter=customers"
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                filter === "customers"
                  ? "bg-cyan-400 text-slate-950"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Customers ({customerCount ?? 0})
            </Link>
          </div>

          {/* Contact list */}
          {viewItems.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-16 text-center">
              <h2 className="text-xl font-semibold text-white">
                {filter === "customers" ? "No customers yet" : "No leads yet"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-slate-400">
                {filter === "customers"
                  ? "Convert a lead to customer when they commit."
                  : "Use the Add Lead form above to start tracking your pipeline."}
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900">
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Company</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Stage</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Value</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Follow-up</th>
                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                  {viewItems.map((contact) => {
                    const followUp = contact.next_follow_up_at
                      ? new Date(contact.next_follow_up_at as string)
                      : null;
                    const isOverdue = followUp && followUp <= new Date();
                    return (
                      <tr key={contact.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-medium text-white">{contact.name}</td>
                        <td className="px-4 py-3 text-slate-400">{(contact.company as string | null) ?? "–"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                              STAGE_COLORS[contact.stage as string] ?? "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {STAGE_LABELS[contact.stage as string] ?? contact.stage}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {contact.estimated_value != null
                            ? `$${Number(contact.estimated_value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                            : "–"}
                        </td>
                        <td className="px-4 py-3">
                          {followUp ? (
                            <span className={isOverdue ? "text-red-400 font-semibold" : "text-slate-300"}>
                              {followUp.toLocaleDateString()}
                              {isOverdue && " ⚠"}
                            </span>
                          ) : (
                            <span className="text-slate-500">–</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {contact.record_type === "lead" && (
                              <form action={convertLeadToCustomer}>
                                <input type="hidden" name="contact_id" value={contact.id} />
                                <button
                                  type="submit"
                                  className="text-xs text-cyan-400 hover:underline"
                                  aria-label={`Convert ${contact.name} to customer`}
                                >
                                  Convert
                                </button>
                              </form>
                            )}
                            <form action={archiveContact}>
                              <input type="hidden" name="contact_id" value={contact.id} />
                              <button
                                type="submit"
                                className="text-xs text-slate-500 hover:text-red-400"
                                aria-label={`Archive ${contact.name}`}
                              >
                                Archive
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
