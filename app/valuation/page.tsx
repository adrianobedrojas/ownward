import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Business Valuation",
  description:
    "Review the financial, operational, and risk factors that may influence the value of a small business.",
};

const valuationFactors = [
  {
    title: "Financial performance",
    description:
      "Revenue, expenses, profit, owner earnings, and the consistency of the business's financial results.",
  },
  {
    title: "Recurring revenue",
    description:
      "Repeat customers, subscriptions, contracts, and predictable sources of future revenue.",
  },
  {
    title: "Customer concentration",
    description:
      "How dependent the business is on one customer or a small group of customers.",
  },
  {
    title: "Owner dependence",
    description:
      "Whether the business can continue operating without the current owner managing every activity.",
  },
  {
    title: "Business records",
    description:
      "The quality of financial statements, contracts, tax records, and operating documentation.",
  },
  {
    title: "Growth potential",
    description:
      "Opportunities to increase customers, expand services, enter new markets, or improve operations.",
  },
];

const readinessItems = [
  "At least 12 months of financial records",
  "Organized income and expense history",
  "Customer and sales information",
  "Business contracts and agreements",
  "List of equipment and business assets",
  "Documented operating procedures",
];

export default function ValuationPage() {
  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Ownward Valuation
          </p>

          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Understand what may influence your business&apos;s value
          </h1>

          <p className="mt-4 text-lg leading-8 text-slate-300">
            Review your financial performance, business risks, records, and
            growth opportunities before preparing for a potential sale.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
          <p className="font-semibold text-amber-300">
            Preliminary planning tool
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-300">
            This page is being designed for educational business planning. A
            future estimate from Ownward should not be treated as a certified
            appraisal, guaranteed selling price, investment recommendation, or
            professional financial opinion.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                Business information
              </p>

              <h2 className="mt-2 text-2xl font-bold text-white">
                Start a preliminary valuation
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Enter basic operating information to prepare for a future
                valuation estimate.
              </p>
            </div>

            <form className="mt-8 space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="industry"
                    className="block text-sm font-semibold text-slate-300"
                  >
                    Industry
                  </label>

                  <select
                    id="industry"
                    name="industry"
                    defaultValue=""
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 outline-none focus:border-cyan-400"
                  >
                    <option value="" disabled>
                      Select an industry
                    </option>
                    <option value="services">Professional services</option>
                    <option value="home-services">Home services</option>
                    <option value="food">Food and beverage</option>
                    <option value="retail">Retail</option>
                    <option value="construction">Construction</option>
                    <option value="marketing">Marketing</option>
                    <option value="technology">Technology</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="year-established"
                    className="block text-sm font-semibold text-slate-300"
                  >
                    Year established
                  </label>

                  <input
                    id="year-established"
                    name="yearEstablished"
                    type="number"
                    min="1800"
                    placeholder="2020"
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="annual-revenue"
                    className="block text-sm font-semibold text-slate-300"
                  >
                    Annual revenue
                  </label>

                  <input
                    id="annual-revenue"
                    name="annualRevenue"
                    type="number"
                    min="0"
                    placeholder="$0"
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="annual-expenses"
                    className="block text-sm font-semibold text-slate-300"
                  >
                    Annual expenses
                  </label>

                  <input
                    id="annual-expenses"
                    name="annualExpenses"
                    type="number"
                    min="0"
                    placeholder="$0"
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="owner-earnings"
                  className="block text-sm font-semibold text-slate-300"
                >
                  Annual owner earnings
                </label>

                <input
                  id="owner-earnings"
                  name="ownerEarnings"
                  type="number"
                  min="0"
                  placeholder="$0"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  This generally represents the financial benefit received by
                  the owner, but the appropriate calculation can depend on the
                  business and valuation method.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="recurring-revenue"
                    className="block text-sm font-semibold text-slate-300"
                  >
                    Recurring revenue
                  </label>

                  <div className="relative mt-2">
                    <input
                      id="recurring-revenue"
                      name="recurringRevenue"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 pr-10 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                    />

                    <span className="absolute right-4 top-3 text-slate-500">
                      %
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="largest-customer"
                    className="block text-sm font-semibold text-slate-300"
                  >
                    Revenue from largest customer
                  </label>

                  <div className="relative mt-2">
                    <input
                      id="largest-customer"
                      name="largestCustomer"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 pr-10 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                    />

                    <span className="absolute right-4 top-3 text-slate-500">
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="owner-hours"
                  className="block text-sm font-semibold text-slate-300"
                >
                  Owner&apos;s weekly working hours
                </label>

                <input
                  id="owner-hours"
                  name="ownerHours"
                  type="number"
                  min="0"
                  max="168"
                  placeholder="40"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />

                <p className="mt-2 text-xs text-slate-500">
                  This helps measure how dependent the business is on the
                  current owner.
                </p>
              </div>

              <button
                type="button"
                className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Calculate preliminary estimate
              </button>

              <p className="text-center text-xs leading-5 text-slate-500">
                Calculations will become active after a tested valuation model
                and secure financial-data storage are connected.
              </p>
            </form>
          </section>

          <aside className="space-y-6">
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                Sale readiness
              </p>

              <h2 className="mt-2 text-xl font-bold text-white">
                Records to prepare
              </h2>

              <ul className="mt-5 space-y-3">
                {readinessItems.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-slate-300"
                  >
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xs text-cyan-300">
                      ✓
                    </span>

                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/documents"
                className="mt-6 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
              >
                Open Ownward Vault
              </Link>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-bold text-white">
                Thinking about selling?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Use the seller workspace to begin organizing information and
                preparing a confidential business listing.
              </p>

              <Link
                href="/sell"
                className="mt-5 inline-block rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Prepare to sell
              </Link>
            </section>
          </aside>
        </div>

        <section className="mt-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Valuation factors
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              What may influence business value
            </h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {valuationFactors.map((factor) => (
              <article
                key={factor.title}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5"
              >
                <h3 className="font-semibold text-white">
                  {factor.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {factor.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="font-semibold text-white">
            Professional review may be necessary
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            A business&apos;s actual value and selling price can depend on its
            industry, financial records, assets, liabilities, risks,
            negotiations, market conditions, and deal structure. Consider
            consulting a qualified valuation professional, accountant,
            attorney, or other appropriate advisor before making important
            decisions.
          </p>
        </section>
      </section>
    </main>
  );
}
