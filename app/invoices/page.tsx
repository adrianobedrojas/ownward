export default function InvoicesPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Business workspace
          </p>

          <h1 className="mt-2 text-3xl font-bold text-white">
            Invoices
          </h1>

          <p className="mt-2 text-slate-400">
            Create invoices, monitor payments, and track money customers owe.
          </p>
        </div>

        <button
          type="button"
          className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
        >
          + Create invoice
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Draft invoices</p>
          <p className="mt-2 text-3xl font-bold text-white">0</p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Unpaid</p>
          <p className="mt-2 text-3xl font-bold text-white">$0.00</p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Paid this month</p>
          <p className="mt-2 text-3xl font-bold text-white">$0.00</p>
        </article>
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-16 text-center">
        <h2 className="text-xl font-semibold text-white">
          No invoices yet
        </h2>

        <p className="mx-auto mt-2 max-w-md text-slate-400">
          Create your first invoice by selecting a customer, adding services,
          and establishing a payment deadline.
        </p>
      </div>
    </section>
  );
}
