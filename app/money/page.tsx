import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { addTransaction } from "./action";

export const metadata: Metadata = {
  title: "Money",
  description: "Track revenue, expenses, profit, and unpaid invoices.",
};

interface SearchParams {
  error?: string;
  success?: string;
  showForm?: string;
}

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const isAdding = params.showForm === "true";
  const errorMessage = params.error;
  const successMessage = params.success;

  const supabase = await createClient();

  const { data: transactions = [], error } = await supabase
    .from("transactions")
    .select("*")
    .order("transaction_date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions:", error.message);
  }

  const list = transactions ?? [];

  // Calculate metrics
  const totalRevenue = list
    .filter((t) => t.type === "revenue" && t.status === "paid")
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalExpenses = list
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const estimatedProfit = totalRevenue - totalExpenses;

  const unpaidInvoices = list
    .filter((t) => t.type === "invoice" && t.status === "pending")
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Ownward Money
          </p>

          <h1 className="mt-2 text-3xl font-bold text-white">Money</h1>

          <p className="mt-2 text-slate-400">
            Track revenue, expenses, profit, and unpaid invoices in real-time.
          </p>
        </div>

        <a
          href={isAdding ? "/money" : "/money?showForm=true"}
          className="rounded-lg bg-cyan-400 px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          {isAdding ? "Close form" : "+ Add transaction"}
        </a>
      </div>

      {errorMessage && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Action failed ({errorMessage}). Please verify your input and try again.
        </div>
      )}

      {successMessage && (
        <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          Transaction successfully recorded.
        </div>
      )}

      {isAdding && (
        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white">Record new transaction</h2>
          <form action={addTransaction} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-slate-300">
                Title / Description
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder="e.g. Client deposit, Software subscription"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600"
              />
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-semibold text-slate-300">
                Amount ($)
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-semibold text-slate-300">
                Type
              </label>
              <select
                id="type"
                name="type"
                defaultValue="revenue"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300"
              >
                <option value="revenue">Revenue (Income)</option>
                <option value="expense">Expense</option>
                <option value="invoice">Invoice</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-slate-300">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue="paid"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300"
              >
                <option value="paid">Paid / Completed</option>
                <option value="pending">Pending / Unpaid</option>
              </select>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-semibold text-slate-300">
                Category
              </label>
              <input
                id="category"
                name="category"
                type="text"
                defaultValue="Operations"
                required
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div>
              <label htmlFor="transaction_date" className="block text-sm font-semibold text-slate-300">
                Date
              </label>
              <input
                id="transaction_date"
                name="transaction_date"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                required
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 mt-2">
              <a
                href="/money"
                className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:bg-slate-800"
              >
                Cancel
              </a>
              <button
                type="submit"
                className="rounded-lg bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Save transaction
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Revenue</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {formatCurrency(totalRevenue)}
          </p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Expenses</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {formatCurrency(totalExpenses)}
          </p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Estimated profit</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">
            {formatCurrency(estimatedProfit)}
          </p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Unpaid invoices</p>
          <p className="mt-2 text-3xl font-bold text-amber-400">
            {formatCurrency(unpaidInvoices)}
          </p>
        </article>
      </div>

      {list.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-16 text-center">
          <h2 className="text-xl font-semibold text-white">No transactions yet</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-400">
            Add your first income or expense to begin tracking the financial health of your business.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="font-semibold text-white">Transaction history</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {list.map((tx) => (
                  <tr key={tx.id} className="transition hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-medium text-white">{tx.title}</td>
                    <td className="px-6 py-4 text-slate-400">{tx.category}</td>
                    <td className="px-6 py-4 capitalize">
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 capitalize">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          tx.status === "paid"
                            ? "bg-emerald-400/10 text-emerald-400"
                            : "bg-amber-400/10 text-amber-400"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{tx.transaction_date}</td>
                    <td
                      className={`px-6 py-4 text-right font-semibold ${
                        tx.type === "expense" ? "text-slate-300" : "text-emerald-400"
                      }`}
                    >
                      {tx.type === "expense" ? "-" : "+"}
                      {formatCurrency(Number(tx.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
