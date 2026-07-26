import Link from "next/link";

const quickActions = [
  {
    name: "Add a customer",
    description: "Create a customer or lead record.",
    href: "/customers",
  },
  {
    name: "Create a task",
    description: "Organize your next business priority.",
    href: "/tasks",
  },
  {
    name: "Create an invoice",
    description: "Prepare an invoice for a customer.",
    href: "/invoices",
  },
  {
    name: "Upload a document",
    description: "Store a business document in your vault.",
    href: "/upload",
  },
];

export default function DashboardPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          Ownward Workspace
        </p>

        <h1 className="mt-2 text-3xl font-bold text-white">
          Dashboard
        </h1>

        <p className="mt-2 text-slate-400">
          See your customers, tasks, invoices, and money in one place.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Total customers</p>
          <p className="mt-2 text-3xl font-bold text-white">0</p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Tasks due</p>
          <p className="mt-2 text-3xl font-bold text-white">0</p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Unpaid invoices</p>
          <p className="mt-2 text-3xl font-bold text-amber-400">$0</p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Estimated profit</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">$0</p>
        </article>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-white">
            Quick actions
          </h2>

          <div className="mt-5 grid gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                className="rounded-lg border border-slate-800 bg-slate-950 p-4 transition hover:border-cyan-400"
              >
                <p className="font-semibold text-white">
                  {action.name}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  {action.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-white">
            Recent activity
          </h2>

          <div className="mt-5 rounded-lg border border-dashed border-slate-700 px-5 py-12 text-center">
            <p className="font-semibold text-white">
              No activity yet
            </p>

            <p className="mt-2 text-sm text-slate-400">
              New customers, tasks, invoices, payments, and documents will
              appear here.
            </p>
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold text-white">
          Getting started
        </h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <p className="rounded-lg bg-slate-950 p-4 text-slate-300">
            1. Add your first customer
          </p>

          <p className="rounded-lg bg-slate-950 p-4 text-slate-300">
            2. Create a business task
          </p>

          <p className="rounded-lg bg-slate-950 p-4 text-slate-300">
            3. Prepare your first invoice
          </p>

          <p className="rounded-lg bg-slate-950 p-4 text-slate-300">
            4. Record income or an expense
          </p>
        </div>
      </section>
    </section>
  );
}
