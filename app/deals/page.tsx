// app/deals/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Deal Room",
  description:
    "Organize business acquisition discussions, documents, offers, due diligence, and closing tasks.",
};

const dealStages = [
  {
    number: "1",
    title: "Initial interest",
    description:
      "A potential buyer reviews the public listing and requests additional information.",
  },
  {
    number: "2",
    title: "Confidentiality",
    description:
      "The participants review and sign an appropriate confidentiality or nondisclosure agreement.",
  },
  {
    number: "3",
    title: "Information review",
    description:
      "The seller shares approved financial, operational, and legal information with authorized participants.",
  },
  {
    number: "4",
    title: "Offer or letter of intent",
    description:
      "The buyer may submit proposed price, terms, conditions, and a possible transaction timeline.",
  },
  {
    number: "5",
    title: "Due diligence",
    description:
      "The buyer and professional advisors review the business's records, risks, assets, obligations, and operations.",
  },
  {
    number: "6",
    title: "Closing and transfer",
    description:
      "The participants complete final agreements, payment arrangements, and ownership-transfer requirements.",
  },
];

const dealRoomAreas = [
  {
    title: "Participants",
    description:
      "Control which buyers, sellers, attorneys, accountants, and advisors may enter a deal room.",
  },
  {
    title: "Confidential documents",
    description:
      "Organize approved financial, legal, customer, asset, and operating records.",
  },
  {
    title: "Questions and requests",
    description:
      "Keep buyer questions, seller responses, and document requests connected to the transaction.",
  },
  {
    title: "Offers and terms",
    description:
      "Organize proposed price, financing, conditions, timelines, and other offer information.",
  },
  {
    title: "Due-diligence tasks",
    description:
      "Track which records and reviews are requested, pending, completed, or need professional attention.",
  },
  {
    title: "Closing checklist",
    description:
      "Prepare the final steps for agreements, payments, account transfers, licenses, and ownership changes.",
  },
];

export default function DealsPage() {
  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Ownward Hub Deal Room
            </p>

            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              Organize your business acquisition
            </h1>

            <p className="mt-3 max-w-3xl text-slate-400">
              Keep participants, confidential documents, questions, offers,
              due-diligence tasks, and closing steps organized in one
              transaction workspace.
            </p>
          </div>

          <button
            type="button"
            className="rounded-lg bg-cyan-400 px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            + Create Deal Room
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Active deals
            </p>

            <p className="mt-2 text-3xl font-bold text-white">
              0
            </p>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Open requests
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-400">
              0
            </p>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Documents shared
            </p>

            <p className="mt-2 text-3xl font-bold text-cyan-300">
              0
            </p>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Offers received
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-400">
              0
            </p>
          </article>
        </div>

        <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                Current transactions
              </p>

              <h2 className="mt-2 text-2xl font-bold text-white">
                Your Deal Rooms
              </h2>
            </div>

            <Link
              href="/buy"
              className="rounded-lg border border-cyan-400 px-4 py-2 text-center text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
            >
              Explore listings
            </Link>
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-6 py-14 text-center">
            <h3 className="text-xl font-semibold text-white">
              No active Deal Rooms
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
              A Deal Room can be created when a buyer and seller are ready to
              organize confidential discussions and begin reviewing a possible
              acquisition.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/buy"
                className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Browse businesses
              </Link>

              <Link
                href="/sell"
                className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
              >
                Prepare a business for sale
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Transaction process
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              From initial interest to ownership transfer
            </h2>

            <p className="mt-2 max-w-3xl text-slate-400">
              The exact process can change depending on the business,
              location, transaction structure, financing, and professional
              requirements.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dealStages.map((stage) => (
              <article
                key={stage.number}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400/10 font-bold text-cyan-300">
                  {stage.number}
                </span>

                <h3 className="mt-4 font-semibold text-white">
                  {stage.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {stage.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Deal organization
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              What each Deal Room will contain
            </h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dealRoomAreas.map((area) => (
              <article
                key={area.title}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-400"
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

        <section className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Ownward Hub Vault
            </p>

            <h2 className="mt-2 text-xl font-bold text-white">
              Prepare your business records
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Organize your financial, legal, operating, and ownership records
              before deciding which documents should be shared with a
              potential buyer.
            </p>

            <Link
              href="/documents"
              className="mt-5 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
            >
              Open Ownward Hub Vault
            </Link>
          </article>

          <article className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">
              Confidentiality
            </p>

            <h2 className="mt-2 text-xl font-bold text-white">
              Protect sensitive business information
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Do not share passwords, unrestricted bank information, personal
              identification numbers, unprotected customer data, or other
              sensitive records until identity, authorization, security, and
              professional requirements have been appropriately addressed.
            </p>
          </article>
        </section>

        <section className="mt-12 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="font-semibold text-white">
            Professional and regulated services
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Ownward Hub&apos;s Deal Room is being designed as organizational
            software. Legal agreements, business brokerage, securities,
            financing, escrow, tax decisions, valuations, negotiations, and
            ownership transfers may require licensed or qualified
            professionals and regulated service providers.
          </p>
        </section>
      </section>
    </main>
  );
}
