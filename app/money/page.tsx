export default function MoneyPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Business workspace
          </p>

          <h1 className="mt-2 text-3xl font-bold text-white">
            Money
          </h1>

          <p className="mt-2 text-slate-400">
            Track revenue, expenses, profit, and unpaid invoices.
          </p>
        </div>

        <button
          type="button"
          className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
        >
          + Add transaction
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Revenue</p>
          <p className="mt-2 text-3xl font-bold text-white">$0</p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Expenses</p>
          <p className="mt-2 text-3xl font-bold text-white">$0</p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Estimated profit</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">$0</p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Unpaid invoices</p>
          <p className="mt-2 text-3xl font-bold text-amber-400">$0</p>
        </article>
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-16 text-center">
        <h2 className="text-xl font-semibold text-white">
          No transactions yet
        </h2>

        <p className="mx-auto mt-2 max-w-md text-slate-400">
          Add your first income or expense to begin tracking the financial
          health of your business.
        </p>
      </div>
    </section>
  );
}
