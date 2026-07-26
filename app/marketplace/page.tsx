import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Discover small businesses for sale and find what you want to own next.",
};

const businesses = [
  {
    name: "Residential Cleaning Company",
    category: "Service business",
    location: "San Antonio, Texas",
    askingPrice: "$120,000",
    annualRevenue: "$240,000",
    ownerEarnings: "$72,000",
    description:
      "An established residential cleaning company with recurring customers and documented operating procedures.",
  },
  {
    name: "Neighborhood Bakery",
    category: "Food and beverage",
    location: "Austin, Texas",
    askingPrice: "$185,000",
    annualRevenue: "$310,000",
    ownerEarnings: "$86,000",
    description:
      "A local bakery with an established customer base, commercial equipment, and opportunities for delivery growth.",
  },
  {
    name: "Digital Marketing Studio",
    category: "Marketing",
    location: "Remote",
    askingPrice: "$95,000",
    annualRevenue: "$180,000",
    ownerEarnings: "$64,000",
    description:
      "A remote service business providing social media and advertising support to small-business clients.",
  },
];

export default function MarketplacePage() {
  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Ownward Market
            </p>

            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              Businesses for sale
            </h1>

            <p className="mt-3 max-w-2xl text-slate-400">
              Discover small-business opportunities and find what you want to
              own next.
            </p>
          </div>

          <Link
            href="/sell"
            className="rounded-lg bg-cyan-400 px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Sell a business
          </Link>
        </div>

        <div className="mt-8 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-4">
          <p className="font-semibold text-cyan-300">
            Marketplace preview
          </p>

          <p className="mt-1 text-sm text-slate-300">
            The businesses shown below are example listings used to design and
            test the Ownward marketplace. They are not real businesses for
            sale.
          </p>
        </div>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold text-white">
            Search opportunities
          </h2>

          <form className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <label
                htmlFor="search"
                className="block text-sm font-semibold text-slate-300"
              >
                Business
              </label>

              <input
                id="search"
                name="search"
                type="search"
                placeholder="Search businesses"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600"
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="block text-sm font-semibold text-slate-300"
              >
                Category
              </label>

              <select
                id="category"
                name="category"
                defaultValue=""
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300"
              >
                <option value="">All categories</option>
                <option value="services">Services</option>
                <option value="food">Food and beverage</option>
                <option value="retail">Retail</option>
                <option value="marketing">Marketing</option>
                <option value="technology">Technology</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-semibold text-slate-300"
              >
                Location
              </label>

              <input
                id="location"
                name="location"
                type="text"
                placeholder="City, state, or remote"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                className="w-full rounded-lg bg-slate-700 px-5 py-3 font-semibold text-white transition hover:bg-slate-600"
              >
                Search
              </button>
            </div>
          </form>

          <p className="mt-3 text-xs text-slate-500">
            Search and filtering will become active after the marketplace
            database is connected.
          </p>
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Featured opportunities
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Example listings showing how businesses will appear.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              {businesses.length} demo listings
            </p>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {businesses.map((business) => (
              <article
                key={business.name}
                className="flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-400"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                    {business.category}
                  </span>

                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Demo
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-semibold text-white">
                  {business.name}
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  {business.location}
                </p>

                <p className="mt-4 flex-1 text-sm leading-6 text-slate-300">
                  {business.description}
                </p>

                <div className="mt-6 grid grid-cols-3 gap-3 border-y border-slate-800 py-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Asking price
                    </p>

                    <p className="mt-1 text-sm font-semibold text-white">
                      {business.askingPrice}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Revenue
                    </p>

                    <p className="mt-1 text-sm font-semibold text-white">
                      {business.annualRevenue}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Earnings
                    </p>

                    <p className="mt-1 text-sm font-semibold text-emerald-400">
                      {business.ownerEarnings}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-slate-500">
                  Details coming soon
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              For buyers
            </p>

            <h2 className="mt-3 text-2xl font-bold text-white">
              Find what you want to own next
            </h2>

            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              <li>Search businesses by category, location, and price.</li>
              <li>Compare financial and operating information.</li>
              <li>Request access to confidential business documents.</li>
              <li>Organize offers and due-diligence tasks.</li>
            </ul>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              For sellers
            </p>

            <h2 className="mt-3 text-2xl font-bold text-white">
              Prepare and present your business
            </h2>

            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              <li>Create a confidential business listing.</li>
              <li>Organize financial and operating records.</li>
              <li>Prepare documents for buyer due diligence.</li>
              <li>Connect with interested potential buyers.</li>
            </ul>

            <Link
              href="/sell"
              className="mt-6 inline-block rounded-lg border border-cyan-400 px-5 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
            >
              Start preparing to sell
            </Link>
          </article>
        </section>
      </section>
    </main>
  );
}
