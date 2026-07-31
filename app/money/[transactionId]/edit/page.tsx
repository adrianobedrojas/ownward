import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import {
  REVENUE_CATEGORIES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from "@/lib/bookkeeping";
import { updateTransaction } from "@/app/money/actions";

interface EditPageProps {
  params: Promise<{ transactionId: string }>;
  searchParams: Promise<{ month?: string; error?: string }>;
}

export default async function EditTransactionPage({ params, searchParams }: EditPageProps) {
  const { transactionId } = await params;
  const { month, error: errorParam } = await searchParams;
  const { supabase, user } = await requireUser();

  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (txError || !tx) notFound();

  // Check if the period is closed
  const monthStart = tx.transaction_date.slice(0, 7) + "-01";
  const { data: period } = await supabase
    .from("bookkeeping_periods")
    .select("status")
    .eq("user_id", user.id)
    .eq("month_start", monthStart)
    .is("business_id", null)
    .maybeSingle();
  const isClosed = period?.status === "closed";

  // If closed, redirect to money with warning
  if (isClosed) {
    const m = month ?? tx.transaction_date.slice(0, 7);
    redirect(`/money?month=${m}&error=PeriodClosed`);
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("id, filename, folder")
    .eq("user_id", user.id)
    .in("folder", ["receipts", "expenses", "invoices"])
    .order("created_at", { ascending: false })
    .limit(100);
  const documentOptions = documents ?? [];

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("name");
  const businessList = businesses ?? [];

  const monthParam = month ?? tx.transaction_date.slice(0, 7);

  const ERROR_LABELS: Record<string, string> = {
    InvalidTitle: "Please enter a valid title.",
    InvalidAmount: "Please enter a valid positive amount.",
    InvalidType: "Invalid transaction type.",
    InvalidStatus: "Invalid status.",
    InvalidCategory: "Please select a valid category.",
    InvalidDate: "Please enter a valid date.",
    InvalidPaymentMethod: "Invalid payment method.",
    InvalidBusiness: "Could not verify business ownership.",
    InvalidDocument: "Could not verify document ownership.",
    PeriodClosed: "This month has been closed. Reopen it to make changes.",
    DatabaseError: "A server error occurred. Please try again.",
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href={`/money?month=${monthParam}`} className="text-slate-400 hover:text-white text-sm">
          ← Back to Bookkeeping
        </Link>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Ownward Books</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Edit transaction</h1>
      </div>

      {errorParam && (
        <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          {ERROR_LABELS[errorParam] ?? "An error occurred. Please verify your input and try again."}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <form action={updateTransaction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="transaction_id" value={tx.id} />
          <input type="hidden" name="month" value={monthParam} />

          <div>
            <label htmlFor="title" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Description *</label>
            <input id="title" name="title" type="text" required maxLength={250}
              defaultValue={tx.title}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white focus:border-cyan-400 outline-none" />
          </div>

          <div>
            <label htmlFor="amount" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Amount ($) *</label>
            <input id="amount" name="amount" type="number" step="0.01" min="0.01" required
              defaultValue={Number(tx.amount)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white focus:border-cyan-400 outline-none" />
          </div>

          <div>
            <label htmlFor="type" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Type *</label>
            <select id="type" name="type" required defaultValue={tx.type === "invoice" ? "revenue" : tx.type}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-cyan-400 outline-none">
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </select>
            {tx.type === "invoice" && (
              <p className="mt-1 text-xs text-amber-400">Legacy invoice-type transaction. Invoices are managed at /invoices.</p>
            )}
          </div>

          <div>
            <label htmlFor="category" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Category *</label>
            <select id="category" name="category" required defaultValue={tx.category ?? ""}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-cyan-400 outline-none">
              <option value="" disabled>Select category</option>
              <optgroup label="Revenue">
                {REVENUE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </optgroup>
              <optgroup label="Expense">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label htmlFor="transaction_date" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Date *</label>
            <input id="transaction_date" name="transaction_date" type="date" required
              defaultValue={tx.transaction_date}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white focus:border-cyan-400 outline-none" />
          </div>

          <div>
            <label htmlFor="status" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Status</label>
            <select id="status" name="status" defaultValue={tx.status ?? "paid"}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-cyan-400 outline-none">
              <option value="paid">Paid / Completed</option>
              <option value="pending">Pending / Unpaid</option>
            </select>
          </div>

          <div>
            <label htmlFor="vendor" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Vendor / Payer</label>
            <input id="vendor" name="vendor" type="text" maxLength={200}
              defaultValue={tx.vendor ?? ""}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white focus:border-cyan-400 outline-none" />
          </div>

          <div>
            <label htmlFor="payment_method" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Payment method</label>
            <select id="payment_method" name="payment_method" defaultValue={tx.payment_method ?? ""}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-cyan-400 outline-none">
              <option value="">— optional —</option>
              {PAYMENT_METHODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="receipt_document_id" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Receipt (from Vault)</label>
            {documentOptions.length === 0 ? (
              <div className="mt-2">
                <p className="text-xs text-slate-500">No receipt documents in Vault.</p>
                <Link href="/upload" className="mt-1 text-xs text-cyan-400 hover:text-cyan-300">Upload receipt to Vault →</Link>
              </div>
            ) : (
              <select id="receipt_document_id" name="receipt_document_id" defaultValue={tx.receipt_document_id ?? ""}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-cyan-400 outline-none">
                <option value="">— none —</option>
                {documentOptions.map((doc) => (
                  <option key={doc.id} value={doc.id}>{doc.filename}</option>
                ))}
              </select>
            )}
          </div>

          {businessList.length > 0 && (
            <div>
              <label htmlFor="business_id" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Business workspace</label>
              <select id="business_id" name="business_id" defaultValue={tx.business_id ?? ""}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-cyan-400 outline-none">
                <option value="">General business</option>
                {businessList.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3 pt-6">
            <input id="is_tax_deductible" name="is_tax_deductible" type="checkbox"
              defaultChecked={Boolean(tx.is_tax_deductible)}
              className="h-4 w-4 accent-cyan-400" />
            <label htmlFor="is_tax_deductible" className="text-sm text-slate-300">Tax deductible</label>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Notes</label>
            <textarea id="notes" name="notes" rows={3} maxLength={1000}
              defaultValue={tx.notes ?? ""}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder:text-slate-600 focus:border-cyan-400 outline-none" />
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex justify-between gap-3 mt-2">
            <Link href={`/money?month=${monthParam}`}
              className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800">
              Cancel
            </Link>
            <button type="submit"
              className="rounded-lg bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
              Save changes
            </button>
          </div>
        </form>
      </div>

      {tx.invoice_id && (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">
          This transaction was created from an invoice.
          <Link href="/invoices" className="ml-2 text-cyan-400 hover:text-cyan-300">View invoices →</Link>
        </div>
      )}
    </section>
  );
}
