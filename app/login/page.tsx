import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Log In",
  description:
    "Log in to Ownward to manage your business, marketplace activity, and documents.",
};

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          Welcome back
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Continue your Ownward journey
        </h1>

        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
          Access your business workspace, marketplace activity, financial
          records, documents, and acquisition tools.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="font-semibold text-white">
              For business owners
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Manage customers, tasks, invoices, money, documents, and sale
              preparation.
            </p>
          </article>

          <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="font-semibold text-white">
              For buyers
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Review opportunities, organize due diligence, and manage
              potential acquisitions.
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950 sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Ownward account
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            Log in
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Enter your account information to continue.
          </p>
        </div>

        <form
          action="/api/login"
          method="post"
          className="mt-8 space-y-6"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-slate-300"
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-300"
              >
                Password
              </label>

              <span className="text-xs text-slate-500">
                Password recovery coming soon
              </span>
            </div>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
            />
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              name="remember"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-700 bg-slate-950 accent-cyan-400"
            />

            Keep me logged in
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Log in
          </button>

          <p className="text-center text-xs text-slate-500">
            Sign in securely with your Ownward account.
          </p>
        </form>

        <div className="mt-8 border-t border-slate-800 pt-6 text-center">
          <p className="text-sm text-slate-400">
            Do not have an Ownward account?
          </p>

          <Link
            href="/signup"
            className="mt-3 inline-block font-semibold text-cyan-300 hover:text-cyan-200"
          >
            Create an account
          </Link>
        </div>

        <Link
          href="/"
          className="mt-6 block text-center text-sm font-semibold text-slate-400 hover:text-white"
        >
          Return to the Ownward homepage
        </Link>
      </section>
    </main>
  );
}
