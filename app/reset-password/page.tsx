import type { Metadata } from "next";
import Link from "next/link";
import { updatePassword } from "./actions";

export const metadata: Metadata = {
  title: "Set New Password",
  description: "Set a new password for your Ownward account.",
};

interface SearchParams {
  error?: string;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const errorParam = params.error;

  function errorMessage(code: string | undefined) {
    switch (code) {
      case "weak-password":
        return "Your password must be at least 8 characters.";
      case "password-mismatch":
        return "Passwords do not match. Please try again.";
      case "update-failed":
        return "Could not update your password. The reset link may have expired.";
      default:
        return null;
    }
  }

  const message = errorMessage(errorParam);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950 sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Ownward account
          </p>

          <h1 className="mt-2 text-2xl font-bold text-white">
            Set a new password
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Choose a new password for your Ownward account.
          </p>
        </div>

        <form action={updatePassword} className="mt-8 space-y-6">
          {message && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {message}
            </div>
          )}

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-slate-300"
            >
              New password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Create a new password"
              minLength={8}
              required
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-slate-300"
            >
              Confirm new password
            </label>

            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your new password"
              minLength={8}
              required
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
            />
          </div>

          <p className="text-xs text-slate-500">
            Your password must be at least 8 characters.
          </p>

          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Update password
          </button>
        </form>

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
