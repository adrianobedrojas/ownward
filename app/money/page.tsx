import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import {
  calcRevenue,
  calcExpenses,
  calcProfit,
  calcHealthScore,
  detectPossibleDuplicates,
  getAttentionReasons,
  ATTENTION_REASON_LABELS,
  ATTENTION_REASON_DESCRIPTIONS,
  REVENUE_CATEGORIES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  getCategoryLabel,
  getPaymentMethodLabel,
  formatCurrency,
  formatMonthLabel,
  currentMonthParam,
  monthStartIso,
  monthEndIso,
  shiftMonth,
  isValidCategory,
} from "@/lib/bookkeeping";
import {
  markTransactionReviewed,
  toggleTransactionReconciled,
  addTransaction,
  closeMonth,
  reopenMonth,
} from "./actions";
import DeleteTransactionButton from "./components/DeleteTransactionButton";
import type { MoneyPageParams } from "./types";

export const metadata: Metadata = {
  title: "Ownward Books",
  description: "Organize income, expenses, receipts, invoices, and monthly records.",
};

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<MoneyPageParams>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();

  const monthParam = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? "")
    ? params.month!
    : currentMonthParam();
  const prevMonth = shiftMonth(monthParam, -1);
  const nextMonth = shiftMonth(monthParam, 1);

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("name");
  const businessList = businesses ?? [];
  const selectedBusiness = businessList.find((b) => b.id === params.business) ?? null;

  const monthStart = monthStartIso(monthParam);
  const monthEnd = monthEndIso(monthParam);

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .gte("transaction_date", monthStart)
    .lte("transaction_date", monthEnd)
    .order("transaction_date", { ascending: false });

  if (selectedBusiness) {
    query = query.eq("business_id", selectedBusiness.id);
  }

  const typeFilter = params.type ?? "";
  const reviewFilter = params.review ?? "";
  const searchQuery = (params.search ?? "").trim().toLowerCase();

  if (typeFilter && ["revenue", "expense", "invoice"].includes(typeFilter)) {
    query = query.eq("type", typeFilter);
  }
  if (reviewFilter && ["needs_review", "reviewed"].includes(reviewFilter)) {
    query = query.eq("review_status", reviewFilter);
  }

  const { data: rawTransactions, error: txError } = await query;
  if (txError) console.error("Fetch transactions error:", txError.message);
  let transactions = rawTransactions ?? [];

  if (searchQuery) {
    transactions = transactions.filter(
      (t: { title: string; vendor?: string | null; category?: string | null }) =>
        t.title.toLowerCase().includes(searchQuery) ||
        (t.vendor ?? "").toLowerCase().includes(searchQuery) ||
        (t.category ?? "").toLowerCase().includes(searchQuery)
    );
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("id, filename, folder")
    .eq("user_id", user.id)
    .in("folder", ["receipts", "expenses", "invoices"])
    .order("created_at", { ascending: false })
    .limit(100);
  const documentOptions = documents ?? [];

  const { data: allMonthTxs } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .gte("transaction_date", monthStart)
    .lte("transaction_date", monthEnd);
  const allTxs = allMonthTxs ?? [];

  const revenue = calcRevenue(allTxs);
  const expenses = calcExpenses(allTxs);
  const profit = calcProfit(revenue, expenses);

  const duplicateIds = detectPossibleDuplicates(allTxs);
  const attentionItems: { tx: (typeof allTxs)[0]; reasons: string[] }[] = [];
  for (const tx of allTxs) {
    const reasons = getAttentionReasons(tx);
    if (duplicateIds.has(tx.id)) reasons.push("possible_duplicate");
    if (reasons.length > 0) attentionItems.push({ tx, reasons });
  }

  const expenseCount = allTxs.filter((t: { type: string }) => t.type === "expense").length;
  const health = calcHealthScore({
    totalTransactions: allTxs.length,
    reviewedCount: allTxs.filter((t: { review_status: string }) => t.review_status === "reviewed").length,
    categorizedCount: allTxs.filter((t: { category: string }) => isValidCategory(t.category)).length,
    expenseCount,
    expenseWithReceiptCount: allTxs.filter(
      (t: { type: string; receipt_document_id?: string | null }) =>
        t.type === "expense" && t.receipt_document_id
    ).length,
    reconciledCount: allTxs.filter((t: { reconciled_at?: string | null }) => t.reconciled_at).length,
  });

  const { data: periodRow } = await supabase
    .from("bookkeeping_periods")
    .select("status, closed_at")
    .eq("user_id", user.id)
    .eq("month_start", monthStart)
    .is("business_id", null)
    .maybeSingle();
  const isClosed = periodRow?.status === "closed";

  const { data: unpaidInvoices } = await supabase
    .from("invoices")
    .select("id, customer_name, amount, due_date")
    .eq("user_id", user.id)
    .eq("status", "unpaid")
    .limit(5);
  const unpaidInvoiceList = unpaidInvoices ?? [];
  const totalUnpaidInvoices = unpaidInvoiceList.reduce(
    (acc: number, inv: { amount: string | number }) => acc + Number(inv.amount),
    0
  );

  const allCategorized = allTxs.length > 0 && allTxs.every((t: { category: string }) => isValidCategory(t.category));
  const allReviewed = allTxs.length > 0 && allTxs.every((t: { review_status: string }) => t.review_status === "reviewed");
  const allHaveReceipts =
    expenseCount === 0 ||
    allTxs.filter((t: { type: string }) => t.type === "expense").every(
      (t: { receipt_document_id?: string | null }) => t.receipt_document_id
    );
  const allReconciled = allTxs.length > 0 && allTxs.every((t: { reconciled_at?: string | null }) => t.reconciled_at);
  const invoicesReviewed = unpaidInvoiceList.length === 0;
  const canClose = allCategorized && allReviewed && !isClosed && allTxs.length > 0;

  const isAdding = params.showForm === "true";
  const errorMessage = params.error;
  const successMessage = params.success;

  const ERROR_LABELS: Record<string, string> = {
    InvalidTitle: "Please enter a valid title (1–250 characters).",
    InvalidAmount: "Please enter a valid positive amount.",
    InvalidType: "Invalid transaction type.",
    InvalidStatus: "Invalid status.",
    InvalidCategory: "Please select a valid category.",
    InvalidDate: "Please enter a valid date.",
    InvalidPaymentMethod: "Invalid payment method.",
    InvalidBusiness: "Could not verify business ownership.",
    InvalidDocument: "Could not verify document ownership.",
    PeriodClosed: "This month has been closed. Reopen it to make changes.",
    PeriodNotReady: "All transactions must be reviewed and categorized before closing the month.",
    DatabaseError: "A server error occurred. Please try again.",
    NotFound: "Transaction not found.",
    MissingId: "Missing transaction ID.",
    InvalidMonth: "Invalid month.",
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Ownward Books
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">Bookkeeping</h1>
          <p className="mt-2 max-w-xl text-slate-400">
            Organize income, expenses, receipts, invoices, and monthly records in one place.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Financial summaries are organizational estimates only and do not constitute
            accounting, tax, or legal advice. Consult a qualified professional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <form method="GET" action="/money" className="flex items-center gap-1">
            {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
            {selectedBusiness && <input type="hidden" name="business" value={selectedBusiness.id} />}
            <input type="hidden" name="month" value={prevMonth} />
            <button type="submit" className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">←</button>
          </form>

          <form method="GET" action="/money" className="flex items-center">
            {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
            {selectedBusiness && <input type="hidden" name="business" value={selectedBusiness.id} />}
            <select
              name="month"
              defaultValue={monthParam}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300"
              aria-label="Select month"
            >
              {Array.from({ length: 24 }, (_, i) => {
                const m = shiftMonth(currentMonthParam(), -i);
                return <option key={m} value={m}>{formatMonthLabel(m)}</option>;
              })}
            </select>
            <noscript>
              <button type="submit" className="ml-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300">Go</button>
            </noscript>
          </form>

          <form method="GET" action="/money" className="flex items-center gap-1">
            {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
            {selectedBusiness && <input type="hidden" name="business" value={selectedBusiness.id} />}
            <input type="hidden" name="month" value={nextMonth} />
            <button type="submit" className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">→</button>
          </form>

          <Link
            href={isAdding ? `/money?month=${monthParam}` : `/money?showForm=true&month=${monthParam}`}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
          >
            {isAdding ? "Close form" : "+ Add transaction"}
          </Link>

          <a
            href={`/money/export?month=${monthParam}${selectedBusiness ? `&business=${selectedBusiness.id}` : ""}`}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
          >
            Export CSV
          </a>
        </div>
      </div>

      {businessList.length > 0 && (
        <form method="GET" action="/money" className="mt-4 flex items-center gap-2">
          <input type="hidden" name="month" value={monthParam} />
          <label htmlFor="business-select" className="text-sm text-slate-400">Workspace:</label>
          <select
            id="business-select"
            name="business"
            defaultValue={selectedBusiness?.id ?? ""}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-300"
          >
            <option value="">General business</option>
            {businessList.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800">
            Apply
          </button>
        </form>
      )}

      <div className="mt-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-white">{formatMonthLabel(monthParam)}</h2>
        {isClosed && (
          <span className="rounded-full bg-emerald-400/10 px-3 py-0.5 text-xs font-semibold text-emerald-400">
            Closed
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          {ERROR_LABELS[errorMessage] ?? "An error occurred. Please verify your input and try again."}
        </div>
      )}
      {successMessage && (
        <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {successMessage === "Added" && "Transaction recorded successfully."}
          {successMessage === "Updated" && "Transaction updated successfully."}
          {successMessage === "Deleted" && "Transaction deleted."}
          {successMessage === "MonthClosed" && "Month closed. Records are now locked."}
          {successMessage === "MonthReopened" && "Month reopened. Transactions can be edited."}
          {!["Added","Updated","Deleted","MonthClosed","MonthReopened"].includes(successMessage) && "Done."}
        </div>
      )}

      {/* Add transaction form */}
      {isAdding && !isClosed && (
        <section className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-6">
          <h3 className="text-lg font-semibold text-white">Record new transaction</h3>
          <form action={addTransaction} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <input type="hidden" name="month" value={monthParam} />
            {selectedBusiness && <input type="hidden" name="business_id" value={selectedBusiness.id} />}

            <div>
              <label htmlFor="title" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Description *</label>
              <input id="title" name="title" type="text" required maxLength={250}
                placeholder="e.g. Client retainer, Office supplies"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder:text-slate-600 focus:border-cyan-400 outline-none" />
            </div>

            <div>
              <label htmlFor="amount" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Amount ($) *</label>
              <input id="amount" name="amount" type="number" step="0.01" min="0.01" required
                placeholder="0.00"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder:text-slate-600 focus:border-cyan-400 outline-none" />
            </div>

            <div>
              <label htmlFor="type" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Type *</label>
              <select id="type" name="type" required defaultValue="revenue"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-cyan-400 outline-none">
                <option value="revenue">Revenue</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div>
              <label htmlFor="category" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Category *</label>
              <select id="category" name="category" required defaultValue=""
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
                defaultValue={`${monthParam}-01`}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white focus:border-cyan-400 outline-none" />
            </div>

            <div>
              <label htmlFor="status" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Status</label>
              <select id="status" name="status" defaultValue="paid"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-cyan-400 outline-none">
                <option value="paid">Paid / Completed</option>
                <option value="pending">Pending / Unpaid</option>
              </select>
            </div>

            <div>
              <label htmlFor="vendor" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Vendor / Payer</label>
              <input id="vendor" name="vendor" type="text" maxLength={200}
                placeholder="e.g. Acme Corp"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder:text-slate-600 focus:border-cyan-400 outline-none" />
            </div>

            <div>
              <label htmlFor="payment_method" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Payment method</label>
              <select id="payment_method" name="payment_method" defaultValue=""
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
                  <p className="text-xs text-slate-500">No documents in Receipts/Expenses yet.</p>
                  <Link href="/upload" className="mt-1 text-xs text-cyan-400 hover:text-cyan-300">Upload receipt to Vault →</Link>
                </div>
              ) : (
                <select id="receipt_document_id" name="receipt_document_id" defaultValue=""
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-cyan-400 outline-none">
                  <option value="">— none —</option>
                  {documentOptions.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.filename}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input id="is_tax_deductible" name="is_tax_deductible" type="checkbox" className="h-4 w-4 accent-cyan-400" />
              <label htmlFor="is_tax_deductible" className="text-sm text-slate-300">Tax deductible</label>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="notes" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Notes</label>
              <textarea id="notes" name="notes" rows={2} maxLength={1000}
                placeholder="Optional notes about this transaction."
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white placeholder:text-slate-600 focus:border-cyan-400 outline-none" />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 mt-2">
              <Link href={`/money?month=${monthParam}`}
                className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800">
                Cancel
              </Link>
              <button type="submit"
                className="rounded-lg bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
                Save transaction
              </button>
            </div>
          </form>
        </section>
      )}
      {isAdding && isClosed && (
        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          This month is closed. Reopen it below before adding transactions.
        </div>
      )}

      {/* Financial summary */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Revenue</p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{formatCurrency(revenue)}</p>
          <p className="mt-1 text-xs text-slate-500">Paid income this month</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Expenses</p>
          <p className="mt-2 text-2xl font-bold text-white">{formatCurrency(expenses)}</p>
          <p className="mt-1 text-xs text-slate-500">Total expenses this month</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Est. profit</p>
          <p className={`mt-2 text-2xl font-bold ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {formatCurrency(profit)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Revenue minus expenses</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unpaid invoices</p>
          <p className="mt-2 text-2xl font-bold text-amber-400">{formatCurrency(totalUnpaidInvoices)}</p>
          <p className="mt-1 text-xs text-slate-500">Not counted as revenue</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Health score</p>
          <p className="mt-2 text-2xl font-bold text-cyan-400">{health.score}</p>
          <p className="mt-1 text-xs text-slate-500">{health.label}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-cyan-400 transition-all" style={{ width: `${health.score}%` }} />
          </div>
        </article>
      </div>

      {/* Health score breakdown */}
      <details className="mt-4 rounded-xl border border-slate-800 bg-slate-900">
        <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-slate-300 hover:text-white">
          Health score breakdown — {health.score}/100 · {health.label}
        </summary>
        <div className="grid gap-3 px-5 pb-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Reviewed (30%)", pct: health.reviewedPct },
            { label: "Categorized (25%)", pct: health.categorizedPct },
            { label: "Receipts on expenses (25%)", pct: health.receiptPct },
            { label: "Reconciled (20%)", pct: health.reconciledPct },
          ].map(({ label, pct }) => (
            <div key={label}>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{label}</span><span>{pct}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full ${pct >= 80 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-rose-400"}`}
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="px-5 pb-4 text-xs text-slate-500">
          Score reflects organizational completeness only. Not an indicator of certified accounting, tax, audit, or legal compliance.
        </p>
      </details>

      {/* Bookkeeping inbox */}
      {attentionItems.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">
            Bookkeeping Inbox
            <span className="ml-2 rounded-full bg-amber-400/10 px-2.5 py-0.5 text-sm font-medium text-amber-400">
              {attentionItems.length}
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">Transactions that need attention for complete records.</p>
          <div className="mt-4 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900">
            {attentionItems.slice(0, 20).map(({ tx, reasons }) => (
              <div key={tx.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-white">{tx.title}</p>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {tx.transaction_date} · {formatCurrency(Number(tx.amount))} · {tx.type}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {reasons.map((r) => (
                      <span key={r}
                        title={ATTENTION_REASON_DESCRIPTIONS[r as keyof typeof ATTENTION_REASON_DESCRIPTIONS] ?? r}
                        className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                        {ATTENTION_REASON_LABELS[r as keyof typeof ATTENTION_REASON_LABELS] ?? r}
                      </span>
                    ))}
                  </div>
                </div>
                <Link href={`/money/${tx.id}/edit?month=${monthParam}`}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 shrink-0">
                  Fix →
                </Link>
              </div>
            ))}
            {attentionItems.length > 20 && (
              <p className="px-5 py-3 text-sm text-slate-500">{attentionItems.length - 20} more — review in the ledger.</p>
            )}
          </div>
        </section>
      )}

      {/* Filters + ledger */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Transactions</h2>
          <Link href="/money/reports" className="text-sm text-cyan-400 hover:text-cyan-300">View reports →</Link>
        </div>

        <form method="GET" action="/money" className="mt-4 flex flex-wrap items-center gap-2">
          <input type="hidden" name="month" value={monthParam} />
          {selectedBusiness && <input type="hidden" name="business" value={selectedBusiness.id} />}
          <input name="search" type="search" defaultValue={searchQuery}
            placeholder="Search…"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 w-40" />
          <select name="type" defaultValue={typeFilter}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300">
            <option value="">All types</option>
            <option value="revenue">Revenue</option>
            <option value="expense">Expense</option>
          </select>
          <select name="review" defaultValue={reviewFilter}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300">
            <option value="">All review</option>
            <option value="needs_review">Needs review</option>
            <option value="reviewed">Reviewed</option>
          </select>
          <button type="submit" className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
            Filter
          </button>
          {(searchQuery || typeFilter || reviewFilter) && (
            <Link href={`/money?month=${monthParam}${selectedBusiness ? `&business=${selectedBusiness.id}` : ""}`}
              className="text-sm text-slate-400 hover:text-white">
              Clear
            </Link>
          )}
        </form>

        {transactions.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-12 text-center">
            <p className="text-lg font-semibold text-white">No transactions found</p>
            <p className="mt-1 text-sm text-slate-400">
              {allTxs.length === 0
                ? "Add your first transaction to begin tracking financials for this month."
                : "Try adjusting your search or filter criteria."}
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 hidden md:table-cell">Vendor</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Type</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Method</th>
                    <th className="px-4 py-3 hidden lg:table-cell">Receipt</th>
                    <th className="px-4 py-3 hidden md:table-cell">Review</th>
                    <th className="px-4 py-3 hidden md:table-cell">Recon.</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {transactions.map((tx: {
                    id: string; transaction_date: string; title: string; notes?: string | null;
                    vendor?: string | null; category: string; type: string;
                    payment_method?: string | null; receipt_document_id?: string | null;
                    review_status: string; reconciled_at?: string | null;
                    amount: string | number; is_tax_deductible?: boolean;
                  }) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{tx.transaction_date}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white max-w-[200px] truncate" title={tx.title}>{tx.title}</p>
                        {tx.notes && <p className="text-xs text-slate-500 mt-0.5 max-w-[200px] truncate">{tx.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{tx.vendor ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300">
                          {isValidCategory(tx.category) ? getCategoryLabel(tx.category) : tx.category || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          tx.type === "revenue" ? "bg-emerald-400/10 text-emerald-400" :
                          tx.type === "expense" ? "bg-rose-400/10 text-rose-400" :
                          "bg-slate-700 text-slate-300"}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">
                        {tx.payment_method ? getPaymentMethodLabel(tx.payment_method) : "—"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {tx.receipt_document_id ? (
                          <a href={`/api/documents/${tx.receipt_document_id}/download`}
                            className="text-xs text-cyan-400 hover:text-cyan-300" target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        ) : <span className="text-xs text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {tx.review_status === "reviewed" ? (
                          <form action={markTransactionReviewed} className="inline">
                            <input type="hidden" name="transaction_id" value={tx.id} />
                            <input type="hidden" name="review_status" value="needs_review" />
                            <input type="hidden" name="month" value={monthParam} />
                            <button type="submit" disabled={isClosed}
                              className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-400/20 disabled:opacity-50">
                              ✓ Reviewed
                            </button>
                          </form>
                        ) : (
                          <form action={markTransactionReviewed} className="inline">
                            <input type="hidden" name="transaction_id" value={tx.id} />
                            <input type="hidden" name="review_status" value="reviewed" />
                            <input type="hidden" name="month" value={monthParam} />
                            <button type="submit" disabled={isClosed}
                              className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400 hover:bg-slate-700 disabled:opacity-50">
                              Review
                            </button>
                          </form>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <form action={toggleTransactionReconciled} className="inline">
                          <input type="hidden" name="transaction_id" value={tx.id} />
                          <input type="hidden" name="reconcile" value={tx.reconciled_at ? "false" : "true"} />
                          <input type="hidden" name="month" value={monthParam} />
                          <button type="submit" disabled={isClosed}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold disabled:opacity-50 ${
                              tx.reconciled_at ? "bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                            {tx.reconciled_at ? "✓ Reconciled" : "Reconcile"}
                          </button>
                        </form>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${tx.type === "expense" ? "text-slate-300" : "text-emerald-400"}`}>
                        {tx.type === "expense" ? "−" : "+"}{formatCurrency(Number(tx.amount))}
                        {tx.is_tax_deductible && <span className="ml-1 text-xs text-amber-400" title="Tax deductible">✦</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/money/${tx.id}/edit?month=${monthParam}`}
                            className="text-xs text-slate-400 hover:text-white">
                            Edit
                          </Link>
                          {!isClosed && (
                            <DeleteTransactionButton
                              transactionId={tx.id}
                              transactionTitle={tx.title}
                              month={monthParam}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500">
              {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} shown
              {allTxs.length !== transactions.length ? ` (${allTxs.length} total this month)` : ""}
            </div>
          </div>
        )}
      </section>

      {/* Monthly close */}
      <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Monthly close — {formatMonthLabel(monthParam)}</h2>
          {isClosed && (
            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-400">Closed</span>
          )}
        </div>
        <ul className="mt-4 space-y-2">
          {[
            { label: "All transactions categorized", done: allCategorized },
            { label: "All transactions reviewed", done: allReviewed },
            { label: "Expenses checked for receipts", done: allHaveReceipts, warn: !allHaveReceipts },
            { label: "Transactions reconciled", done: allReconciled, warn: !allReconciled },
            { label: "No unpaid invoices outstanding", done: invoicesReviewed, warn: !invoicesReviewed },
          ].map(({ label, done, warn }) => (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span className={`text-lg ${done ? "text-emerald-400" : warn ? "text-amber-400" : "text-slate-600"}`}>
                {done ? "✓" : warn ? "⚠" : "○"}
              </span>
              <span className={done ? "text-slate-300" : "text-slate-500"}>{label}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5">
          {!isClosed ? (
            <form action={closeMonth}>
              <input type="hidden" name="month" value={monthParam} />
              {selectedBusiness && <input type="hidden" name="business_id" value={selectedBusiness.id} />}
              <button type="submit" disabled={!canClose}
                className="rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40">
                Close month
              </button>
              {!canClose && allTxs.length > 0 && (
                <p className="mt-2 text-xs text-amber-400">All transactions must be reviewed and categorized to close the month.</p>
              )}
            </form>
          ) : (
            <form action={reopenMonth}>
              <input type="hidden" name="month" value={monthParam} />
              {selectedBusiness && <input type="hidden" name="business_id" value={selectedBusiness.id} />}
              <button type="submit" className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800">
                Reopen month
              </button>
              <p className="mt-2 text-xs text-slate-500">Reopening will allow transactions in this period to be edited.</p>
            </form>
          )}
        </div>
      </section>

      {/* Footer links */}
      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/invoices" className="text-cyan-400 hover:text-cyan-300">Manage invoices →</Link>
        <Link href="/money/reports" className="text-cyan-400 hover:text-cyan-300">View reports →</Link>
        <Link href="/upload" className="text-slate-400 hover:text-white">Upload receipt to Vault →</Link>
      </div>
    </section>
  );
}
