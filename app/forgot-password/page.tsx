import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "./actions";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your Ownward account password.",
};

interface SearchParams {
  sent?: string;
  error?: string;
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const errorParam = params.error;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950 sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Ownward account
          </p>

          <h1 className="mt-2 text-2xl font-bold text-white">
            Reset your password
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Enter your email address and we will send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="mt-8">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
              <p className="font-semibold text-emerald-300">
                Check your email
              </p>

              <p className="mt-2 text-sm text-emerald-400/80">
                If an account exists for that address, a password reset link
                has been sent. Check your inbox and spam folder.
              </p>
            </div>

            <Link
              href="/login"
              className="mt-6 block text-center text-sm font-semibold text-cyan-300 hover:text-cyan-200"
            >
              Return to login
            </Link>
          </div>
        ) : (
          <form action={requestPasswordReset} className="mt-8 space-y-6">
            {errorParam && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {errorParam === "missing-email"
                  ? "Please enter your email address."
                  : "Something went wrong. Please try again."}
              </div>
            )}

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

            <button
              type="submit"
              className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Send reset link
            </button>
          </form>
        )}

        <div className="mt-8 border-t border-slate-800 pt-6 text-center">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-400 hover:text-white"
          >
            Return to login
          </Link>
        </div>
      </section>
    </main>
  );
}
