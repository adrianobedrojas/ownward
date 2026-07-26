import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Authentication Error",
  description: "An Ownward account authentication error occurred.",
};

export default function ErrorPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
      <section className="w-full max-w-lg rounded-2xl border border-red-900/50 bg-slate-900 p-8 text-center shadow-2xl shadow-slate-950">
        <p className="text-sm font-semibold uppercase tracking-wider text-red-400">
          Sign-in error
        </p>

        <h1 className="mt-3 text-3xl font-bold text-white">
          We could not log you in
        </h1>

        <p className="mt-4 leading-7 text-slate-400">
          Check that your email address and password are correct, then try
          again.
        </p>

        <Link
          href="/login"
          className="mt-8 inline-block rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Return to login
        </Link>

        <Link
          href="/signup"
          className="mt-5 block text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        >
          Create a new account
        </Link>
      </section>
    </main>
  );
}