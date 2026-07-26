import Link from "next/link";

const platformPaths = [
  {
    title: "Run",
    description:
      "Manage customers, tasks, invoices, money, and important business records.",
  },
  {
    title: "Grow",
    description:
      "Find customers, organize leads, improve marketing, and build a healthier business.",
  },
  {
    title: "Buy",
    description:
      "Discover small businesses, review opportunities, and prepare for an acquisition.",
  },
  {
    title: "Sell",
    description:
      "Prepare your records, improve sale readiness, and connect with potential buyers.",
  },
];

export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Ownward
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Run, grow, buy or sell a business—all in one place.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Ownward helps small-business owners manage operations, organize
              financial records, grow their companies, prepare for a sale, and
              connect with potential buyers.
            </p>

            <p className="mt-4 font-semibold text-cyan-300">
              Run it. Grow it. Sell it. Own what&apos;s next.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/marketplace"
                className="rounded-lg bg-cyan-400 px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Explore businesses
              </Link>

              <Link
                href="/sell"
                className="rounded-lg border border-cyan-400 px-5 py-3 text-center font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
              >
                Sell a business
              </Link>

              <Link
                href="/dashboard"
                className="rounded-lg border border-slate-700 px-5 py-3 text-center font-semibold text-white transition hover:bg-slate-800"
              >
                Run your business
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              One connected platform
            </p>

            <h2 className="mt-3 text-2xl font-bold text-white">
              From business operations to ownership transfer
            </h2>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="font-semibold text-white">
                  Organize the business
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Keep customers, tasks, invoices, money, and documents
                  connected.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="font-semibold text-white">
                  Prepare for what comes next
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Build stronger records and understand what may improve the
                  business&apos;s value.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="font-semibold text-white">
                  Connect buyers and sellers
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Discover opportunities and organize the acquisition process
                  in one workspace.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-800 bg-slate-900/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              The Ownward journey
            </p>

            <h2 className="mt-3 text-3xl font-bold text-white">
              Support for every stage of business ownership
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {platformPaths.map((path) => (
              <article
                key={path.title}
                className="rounded-xl border border-slate-800 bg-slate-950 p-6 transition hover:border-cyan-400"
              >
                <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                  {path.title}
                </p>

                <h3 className="mt-3 text-xl font-semibold text-white">
                  {path.title} your business
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {path.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-12 text-center">
          <h2 className="text-3xl font-bold text-white">
            Own what&apos;s next.
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-slate-300">
            Start organizing your business today and build the records,
            systems, and value needed for its next stage.
          </p>

          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Open your dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
