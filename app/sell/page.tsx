import type { Metadata } from "next";
import Link from "next/link";
import { saveListingDraft } from "./actions";

export const metadata: Metadata = {
  title: "Sell a Business",
  description:
    "Prepare your business, organize its records, and create a confidential listing for potential buyers.",
};

const preparationSteps = [
  {
    number: "1",
    title: "Business information",
    description:
      "Describe what the business does, where it operates, and how long it has been operating.",
  },
  {
    number: "2",
    title: "Financial records",
    description:
      "Organize revenue, expenses, owner earnings, tax records, and outstanding obligations.",
  },
  {
    number: "3",
    title: "Operations and assets",
    description:
      "Document equipment, systems, contracts, employees, vendors, and operating procedures.",
  },
  {
    number: "4",
    title: "Confidential listing",
    description:
      "Prepare a summary that buyers can review without immediately revealing sensitive information.",
  },
];

const buyerReviewAreas = [
  {
    title: "Financial information",
    description:
      "Revenue, expenses, profit, tax records, debts, and unpaid obligations.",
  },
  {
    title: "Customers and sales",
    description:
      "Customer concentration, recurring revenue, contracts, and sales history.",
  },
  {
    title: "Operations",
    description:
      "Employees, vendors, equipment, software, procedures, and daily responsibilities.",
  },
  {
    title: "Legal and ownership",
    description:
      "Formation records, licenses, agreements, intellectual property, and ownership documentation.",
  },
];

export default function SellBusinessPage() {
  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Ownward Sellers
          </p>

          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Prepare your business for its next owner
          </h1>

          <p className="mt-4 text-lg leading-8 text-slate-300">
            Organize your business information, improve sale readiness, and
            prepare a confidential listing for potential buyers.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                Listing draft
              </p>

              <h2 className="mt-2 text-2xl font-bold text-white">
                Tell us about the business
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Start with general information. Confidential records should
                only be shared later through a secure deal room.
              </p>
            </div>

            <form action={saveListingDraft} className="mt-8 space-y-6">
              <div>
                <label
                  htmlFor="business-name"
                  className="block text-sm font-semibold text-slate-300"
                >
                  Business name
                </label>

                <input
                  id="business-name"
                  name="businessName"
                  type="text"
                  required
                  placeholder="Enter the business name"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600"
                />

                <p className="mt-2 text-xs text-slate-500">
                  You will eventually be able to hide the business name from
                  public listings.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-semibold text-slate-300"
                  >
                    Business category
                  </label>

                  <select
                    id="category"
                    name="category"
                    defaultValue=""
                    required
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300"
                  >
                    <option value="" disabled>
                      Select a category
                    </option>
                    <option value="services">Services</option>
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
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
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
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600"
                  />
                </div>

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
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="asking-price"
                    className="block text-sm font-semibold text-slate-300"
                  >
                    Asking price
                  </label>

                  <input
                    id="asking-price"
                    name="askingPrice"
                    type="number"
                    min="0"
                    placeholder="$0"
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="summary"
                  className="block text-sm font-semibold text-slate-300"
                >
                  Business summary
                </label>

                <textarea
                  id="summary"
                  name="summary"
                  rows={6}
                  placeholder="Describe what the business does, its customers, its strengths, and its opportunities for growth."
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600"
                />
              </div>

              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4">
                <p className="font-semibold text-amber-300">
                  Protect confidential information
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  Do not include tax identification numbers, bank-account
                  information, passwords, personal addresses, or confidential
                  customer information in a public listing.
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Save draft listing
              </button>
            </form>
          </section>

          <aside className="space-y-6">
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                Sale preparation
              </p>

              <h2 className="mt-2 text-xl font-bold text-white">
                Your preparation roadmap
              </h2>

              <div className="mt-6 space-y-5">
                {preparationSteps.map((step) => (
                  <div key={step.number} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm font-bold text-cyan-300">
                      {step.number}
                    </span>

                    <div>
                      <h3 className="font-semibold text-white">
                        {step.title}
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-bold text-white">
                Organize your records
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Use Ownward Vault to organize contracts, financial records,
                receipts, tax documents, and operating information.
              </p>

              <Link
                href="/documents"
                className="mt-5 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
              >
                Open Ownward Vault
              </Link>
            </section>
          </aside>
        </div>

        <section className="mt-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Buyer review
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              Information buyers may review
            </h2>

            <p className="mt-2 max-w-3xl text-slate-400">
              A buyer will usually want enough information to understand the
              business&apos;s financial condition, operations, customers, risks,
              and ownership.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {buyerReviewAreas.map((area) => (
              <article
                key={area.title}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5"
              >
                <h3 className="font-semibold text-white">
                  {area.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {area.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="font-semibold text-white">
            Important information
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Ownward is being designed as a software platform for organizing
            business information and connecting users. Business valuations,
            legal decisions, taxes, financing, negotiations, and ownership
            transfers may require assistance from qualified professionals.
          </p>
        </section>
      </section>
    </main>
  );
}
