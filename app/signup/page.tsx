import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create an Ownward account to run, grow, buy, or prepare a business for sale.",
};

const accountTypes = [
  {
    title: "Business owner",
    description:
      "Run, grow, organize, and prepare your business for what comes next.",
  },
  {
    title: "Business buyer",
    description:
      "Discover opportunities and organize your acquisition process.",
  },
  {
    title: "Owner and buyer",
    description:
      "Manage your current business while looking for your next opportunity.",
  },
  {
    title: "Advisor or agency",
    description:
      "Help business owners improve operations, grow, and prepare for a sale.",
  },
];

export default function SignupPage() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          Join Ownward
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Own what&apos;s next
        </h1>

        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
          Create an account to run your business, prepare it for sale, explore
          opportunities, or manage your next acquisition.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {accountTypes.map((accountType) => (
            <article
              key={accountType.title}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <h2 className="font-semibold text-white">
                {accountType.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                {accountType.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950 sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Ownward account
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            Create your account
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Tell us how you plan to use Ownward.
          </p>
        </div>

        <form
          action="/api/signup"
          method="post"
          className="mt-8 space-y-6"
          >
          <div>
            <label
              htmlFor="account-type"
              className="block text-sm font-semibold text-slate-300"
            >
              I want to use Ownward as a
            </label>

            <select
              id="account-type"
              name="accountType"
              defaultValue=""
              required
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 outline-none focus:border-cyan-400"
            >
              <option value="" disabled>
                Select an account type
              </option>

              <option value="owner">Business owner</option>
              <option value="buyer">Business buyer</option>
              <option value="owner-buyer">Owner and buyer</option>
              <option value="advisor">Advisor or agency</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="full-name"
              className="block text-sm font-semibold text-slate-300"
            >
              Full name
            </label>

            <input
              id="full-name"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              required
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
            />
          </div>

          <div>
            <label
              htmlFor="business-name"
              className="block text-sm font-semibold text-slate-300"
            >
              Business name
              <span className="ml-2 font-normal text-slate-500">
                Optional
              </span>
            </label>

            <input
              id="business-name"
              name="businessName"
              type="text"
              autoComplete="organization"
              placeholder="Enter your business name"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
            />
          </div>

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

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-300"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a password"
                minLength={8}
                required
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-semibold text-slate-300"
              >
                Confirm password
              </label>

              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your password"
                minLength={8}
                required
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Your password must contain at least eight characters.
          </p>

          <label className="flex items-start gap-3 text-sm text-slate-300">
            <input
              name="agreement"
              type="checkbox"
              required
              className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 accent-cyan-400"
            />

            <span>
              I agree to the Ownward terms of service and privacy policy.
            </span>
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Create account
          </button>

          <p className="text-center text-xs text-slate-500">
            Create your secure Ownward account using Supabase authentication.
          </p>
        </form>

        <div className="mt-8 border-t border-slate-800 pt-6 text-center">
          <p className="text-sm text-slate-400">
            Already have an Ownward account?
          </p>

          <Link
            href="/login"
            className="mt-3 inline-block font-semibold text-cyan-300 hover:text-cyan-200"
          >
            Log in
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