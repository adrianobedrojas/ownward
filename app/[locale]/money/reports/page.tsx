import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import {
  calcRevenue,
  calcExpenses,
  calcProfit,
  formatCurrency,
  formatMonthLabel,
  currentMonthParam,
  monthStartIso,
  monthEndIso,
  shiftMonth,
  getCategoryLabel,
  isValidCategory,
} from "@/lib/bookkeeping";

export const metadata: Metadata = {
  title: "Reports — Ownward Books",
  description: "Monthly revenue, expense, and profit reports for your bookkeeping.",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();

  const monthParam = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? "")
    ? params.month!
    : currentMonthParam();

  const prevMonth = shiftMonth(monthParam, -1);

  // Current month transactions
  const { data: currentTxs } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .gte("transaction_date", monthStartIso(monthParam))
    .lte("transaction_date", monthEndIso(monthParam));
  const current = currentTxs ?? [];

  // Previous month transactions
  const { data: prevTxs } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .gte("transaction_date", monthStartIso(prevMonth))
    .lte("transaction_date", monthEndIso(prevMonth));
  const prev = prevTxs ?? [];

  // Unpaid invoices total
  const { data: unpaidInvs } = await supabase
    .from("invoices")
    .select("amount")
    .eq("user_id", user.id)
    .eq("status", "unpaid");
  const unpaidTotal = (unpaidInvs ?? []).reduce((a: number, i: { amount: string | number }) => a + Number(i.amount), 0);

  // Calculations
  const curRevenue = calcRevenue(current);
  const curExpenses = calcExpenses(current);
  const curProfit = calcProfit(curRevenue, curExpenses);

  const prevRevenue = calcRevenue(prev);
  const prevExpenses = calcExpenses(prev);
  const prevProfit = calcProfit(prevRevenue, prevExpenses);

  const revenueDelta = curRevenue - prevRevenue;
  const expensesDelta = curExpenses - prevExpenses;
  const profitDelta = curProfit - prevProfit;

  // Category breakdowns
  const expenseByCategory: Record<string, number> = {};
  const revenueByCategory: Record<string, number> = {};

  for (const tx of current) {
    const cat = tx.category ?? "other";
    if (tx.type === "expense") {
      expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + Number(tx.amount);
    } else if (tx.type === "revenue" && tx.status === "paid") {
      revenueByCategory[cat] = (revenueByCategory[cat] ?? 0) + Number(tx.amount);
    }
  }

  const sortedExpenses = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
  const sortedRevenue = Object.entries(revenueByCategory).sort((a, b) => b[1] - a[1]);
  const maxExpense = sortedExpenses[0]?.[1] ?? 1;
  const maxRevenue = sortedRevenue[0]?.[1] ?? 1;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Ownward Books</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Reports</h1>
          <p className="mt-1 text-slate-400">Monthly financial overview derived from your bookkeeping records.</p>
          <p className="mt-1 text-xs text-slate-500">Estimates only. Not accounting, tax, or legal advice.</p>
        </div>
        <div className="flex items-center gap-2">
          <form method="GET" action="/money/reports">
            <select name="month" defaultValue={monthParam}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300">
              {Array.from({ length: 24 }, (_, i) => {
                const m = shiftMonth(currentMonthParam(), -i);
                return <option key={m} value={m}>{formatMonthLabel(m)}</option>;
              })}
            </select>
            <noscript>
              <button type="submit" className="ml-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300">Go</button>
            </noscript>
          </form>
          <Link href={`/money?month=${monthParam}`} className="text-sm text-cyan-400 hover:text-cyan-300">← Back to Books</Link>
        </div>
      </div>

      {/* Summary comparison */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Revenue", cur: curRevenue, prev: prevRevenue, delta: revenueDelta, positive: true },
          { label: "Expenses", cur: curExpenses, prev: prevExpenses, delta: expensesDelta, positive: false },
          { label: "Est. profit", cur: curProfit, prev: prevProfit, delta: profitDelta, positive: true },
        ].map(({ label, cur, prev: p, delta, positive }) => (
          <article key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
            <p className={`mt-2 text-2xl font-bold ${cur >= 0 ? (positive ? "text-emerald-400" : "text-white") : "text-rose-400"}`}>
              {formatCurrency(cur)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              vs. {formatMonthLabel(prevMonth)}: {formatCurrency(p)}
            </p>
            <p className={`mt-1 text-xs font-semibold ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {delta >= 0 ? "+" : ""}{formatCurrency(delta)}
            </p>
          </article>
        ))}
      </div>

      {/* Unpaid invoices */}
      <article className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Unpaid invoices total</p>
        <p className="mt-2 text-2xl font-bold text-amber-400">{formatCurrency(unpaidTotal)}</p>
        <p className="mt-1 text-sm text-slate-400">
          Outstanding invoices not included in revenue.
          <Link href="/invoices" className="ml-2 text-cyan-400 hover:text-cyan-300">Manage invoices →</Link>
        </p>
      </article>

      {/* Expense breakdown */}
      {sortedExpenses.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">Expenses by category — {formatMonthLabel(monthParam)}</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">% of total</th>
                  <th className="px-5 py-3 w-1/3 hidden sm:table-cell">Proportion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedExpenses.map(([cat, amount]) => (
                  <tr key={cat} className="hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-medium text-white">
                      {isValidCategory(cat) ? getCategoryLabel(cat) : cat}
                    </td>
                    <td className="px-5 py-3 text-slate-300">{formatCurrency(amount)}</td>
                    <td className="px-5 py-3 text-slate-400">{curExpenses > 0 ? Math.round((amount / curExpenses) * 100) : 0}%</td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full bg-rose-400/70" style={{ width: `${Math.round((amount / maxExpense) * 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-800">
                <tr>
                  <td className="px-5 py-3 font-semibold text-white">Total</td>
                  <td className="px-5 py-3 font-semibold text-white">{formatCurrency(curExpenses)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* Revenue breakdown */}
      {sortedRevenue.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">Revenue by category — {formatMonthLabel(monthParam)}</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">% of total</th>
                  <th className="px-5 py-3 w-1/3 hidden sm:table-cell">Proportion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedRevenue.map(([cat, amount]) => (
                  <tr key={cat} className="hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-medium text-white">
                      {isValidCategory(cat) ? getCategoryLabel(cat) : cat}
                    </td>
                    <td className="px-5 py-3 text-emerald-400">{formatCurrency(amount)}</td>
                    <td className="px-5 py-3 text-slate-400">{curRevenue > 0 ? Math.round((amount / curRevenue) * 100) : 0}%</td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full bg-emerald-400/70" style={{ width: `${Math.round((amount / maxRevenue) * 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-800">
                <tr>
                  <td className="px-5 py-3 font-semibold text-white">Total</td>
                  <td className="px-5 py-3 font-semibold text-emerald-400">{formatCurrency(curRevenue)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {current.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-12 text-center">
          <p className="text-lg font-semibold text-white">No transactions for {formatMonthLabel(monthParam)}</p>
          <p className="mt-1 text-sm text-slate-400">Add transactions in Bookkeeping to see reports here.</p>
          <Link href={`/money?month=${monthParam}`} className="mt-4 inline-block text-sm text-cyan-400 hover:text-cyan-300">
            Go to Bookkeeping →
          </Link>
        </div>
      )}

      <div className="mt-8 flex gap-4 text-sm">
        <Link href={`/money?month=${monthParam}`} className="text-cyan-400 hover:text-cyan-300">← Back to Bookkeeping</Link>
        <a href={`/money/export?month=${monthParam}`} className="text-slate-400 hover:text-white">Export CSV →</a>
      </div>
    </section>
  );
}
