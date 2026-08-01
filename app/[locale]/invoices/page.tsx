import { requireUser } from "@/lib/require-user";
import Link from "next/link";
import { createInvoice, markInvoicePaid } from "./actions";

interface SearchParams {
  error?: string;
  success?: string;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id,user_id,customer_name,amount,status,due_date,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invoices:", error);
  }

  const invoiceList = invoices || [];

  const draftCount = invoiceList.filter((inv) => inv.status === "draft").length;
  const totalUnpaid = invoiceList
    .filter((inv) => inv.status === "unpaid")
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const paidThisMonth = invoiceList
    .filter((inv) => {
      if (inv.status !== "paid") return false;
      const d = new Date(inv.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const ERROR_LABELS: Record<string, string> = {
    MissingId: "Missing invoice ID.",
    NotFound: "Invoice not found.",
    InvoiceAlreadyPaid: "This invoice is already marked as paid.",
    DuplicateTransaction: "A revenue transaction already exists for this invoice.",
    DatabaseError: "A server error occurred. Please try again.",
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 text-slate-100">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Ownward Books
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">Invoices</h1>
          <p className="mt-2 text-slate-400">
            Create invoices, monitor payments, and track money customers owe.
            Part of{" "}
            <Link href="/money" className="text-cyan-400 hover:text-cyan-300">
              Ownward Books
            </Link>
            .
          </p>
        </div>
        <Link
          href="/money"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
        >
          ← Bookkeeping
        </Link>
      </div>

      {params.error && (
        <div className="mt-6 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          {ERROR_LABELS[params.error] ?? "An error occurred. Please try again."}
        </div>
      )}
      {params.success === "InvoicePaid" && (
        <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          Invoice marked as paid. A revenue transaction has been created in Bookkeeping for review.
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Draft invoices</p>
          <p className="mt-2 text-3xl font-bold text-white">{draftCount}</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Unpaid</p>
          <p className="mt-2 text-3xl font-bold text-amber-400">
            ${totalUnpaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Paid this month</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">
            ${paidThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </article>
      </div>

      {/* Create invoice form */}
      <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-white">Create new invoice</h2>
        <p className="mt-1 text-sm text-slate-400">
          Fill out the details below to log a new customer invoice.
        </p>
        <form action={createInvoice} className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="customerName" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Customer Name
            </label>
            <input id="customerName" name="customerName" type="text" required
              placeholder="Acme Corp"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" />
          </div>
          <div>
            <label htmlFor="amount" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Amount ($)
            </label>
            <input id="amount" name="amount" type="number" step="0.01" min="0.01" required
              placeholder="1500.00"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" />
          </div>
          <div>
            <label htmlFor="status" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Status
            </label>
            <select id="status" name="status" defaultValue="draft"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none focus:border-cyan-400">
              <option value="draft">Draft</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label htmlFor="dueDate" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Due Date
            </label>
            <input id="dueDate" name="dueDate" type="date"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none focus:border-cyan-400" />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button type="submit"
              className="rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
              + Save Invoice
            </button>
          </div>
        </form>
      </div>

      {/* Invoices ledger */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-white">Invoices</h2>
        {invoiceList.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-16 text-center">
            <h3 className="text-lg font-semibold text-white">No invoices yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              Create your first invoice using the form above to start tracking accounts receivable.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Created</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {invoiceList.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/50">
                    <td className="p-4 font-medium text-white">{inv.customer_name}</td>
                    <td className="p-4 font-semibold text-white">${Number(inv.amount).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                        inv.status === "paid"
                          ? "bg-emerald-400/10 text-emerald-400 border border-emerald-900/50"
                          : inv.status === "unpaid"
                          ? "bg-amber-400/10 text-amber-400 border border-amber-900/50"
                          : "bg-slate-700/50 text-slate-300 border border-slate-700"
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{inv.due_date || "—"}</td>
                    <td className="p-4 text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      {inv.status === "unpaid" && (
                        <form action={markInvoicePaid}>
                          <input type="hidden" name="invoice_id" value={inv.id} />
                          <button type="submit"
                            className="rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-300">
                            Mark paid
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Marking an invoice paid creates a revenue transaction in{" "}
        <Link href="/money" className="text-cyan-400 hover:text-cyan-300">Ownward Books</Link>{" "}
        for review. Financial summaries are organizational estimates only.
      </p>
    </section>
  );
}
