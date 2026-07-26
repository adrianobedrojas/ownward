import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Grow",
  description:
    "Plan business growth, improve operations, strengthen customer relationships, and increase sale readiness.",
};

const growthAreas = [
  {
    title: "Attract more customers",
    description:
      "Organize leads, define your ideal customer, and create a consistent prospecting routine.",
    action: "Open CRM",
    href: "/customers",
  },
  {
    title: "Improve follow-up",
    description:
      "Create follow-up tasks so interested customers do not get forgotten.",
    action: "Create a task",
    href: "/tasks",
  },
  {
    title: "Increase revenue",
    description:
      "Review pricing, unpaid invoices, customer value, and opportunities for recurring revenue.",
    action: "Review money",
    href: "/money",
  },
  {
    title: "Reduce owner dependence",
    description:
      "Document repeatable tasks so the business can operate without depending entirely on its owner.",
    action: "Plan a task",
    href: "/tasks",
  },
  {
    title: "Strengthen business records",
    description:
      "Organize agreements, invoices, receipts, tax information, and operating procedures.",
    action: "Open Vault",
    href: "/documents",
  },
  {
    title: "Improve sale readiness",
    description:
      "Review the financial, operational, and risk factors that could affect business value.",
    action: "Review valuation",
    href: "/valuation",
  },
];

const growthRoadmap = [
  {
    number: "1",
    title: "Understand your current position",
    description:
      "Review your customers, revenue, expenses, tasks, records, and business responsibilities.",
  },
  {
    number: "2",
    title: "Choose one growth priority",
    description:
      "Focus on one measurable improvement instead of trying to change everything at once.",
  },
  {
    number: "3",
    title: "Create an action plan",
    description:
      "Turn the priority into specific tasks with deadlines and expected results.",
  },
  {
    number: "4",
    title: "Review the results",
    description:
      "Measure what changed and decide whether to continue, adjust, or choose a new priority.",
  },
];

export default function GrowPage() {
  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Ownward Grow
            </p>

            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              Build a stronger and more valuable business
            </h1>

            <p className="mt-3 max-w-3xl text-slate-400">
              Choose growth priorities, organize the work, measure progress,
              and strengthen the systems that help your business succeed.
            </p>
          </div>

          <Link
            href="/tasks"
            className="rounded-lg bg-cyan-400 px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            + Add growth task
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Active leads
            </p>

            <p className="mt-2 text-3xl font-bold text-white">
              0
            </p>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Revenue growth
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-400">
              0%
            </p>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Growth tasks
            </p>

            <p className="mt-2 text-3xl font-bold text-white">
              0
            </p>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Completed priorities
            </p>

            <p className="mt-2 text-3xl font-bold text-cyan-300">
              0
            </p>
          </article>
        </div>

        <section className="mt-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Growth opportunities
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              Choose your next priority
            </h2>

            <p className="mt-2 max-w-3xl text-slate-400">
              Start with the area that could make the most meaningful
              difference for your business.
            </p>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {growthAreas.map((area) => (
              <article
                key={area.title}
                className="flex flex-col rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-400"
              >
                <h3 className="text-lg font-semibold text-white">
                  {area.title}
                </h3>

                <p className="mt-3 flex-1 text-sm leading-6 text-slate-400">
                  {area.description}
                </p>

                <Link
                  href={area.href}
                  className="mt-5 font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  {area.action} →
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Growth roadmap
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              Improve one step at a time
            </h2>

            <div className="mt-7 space-y-6">
              {growthRoadmap.map((step) => (
                <div key={step.number} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 font-bold text-cyan-300">
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
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Growth plan
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              Your current priority
            </h2>

            <div className="mt-6 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-6 py-12 text-center">
              <h3 className="text-lg font-semibold text-white">
                No growth priority selected
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                Choose an opportunity and create tasks to begin building your
                first Ownward growth plan.
              </p>

              <Link
                href="/tasks"
                className="mt-6 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
              >
                Create a growth task
              </Link>
            </div>
          </article>
        </section>

        <section className="mt-12 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="font-semibold text-white">
            Growth recommendations are educational
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Ownward can help organize information, identify possible
            improvement areas, and track business goals. Results are not
            guaranteed, and important financial, legal, tax, marketing, or
            operational decisions may require advice from qualified
            professionals.
          </p>
        </section>
      </section>
    </main>
  );
}
