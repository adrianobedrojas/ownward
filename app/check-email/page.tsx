// app/check-email/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Check Your Email",
  description:
    "Confirm your email address to finish creating your Ownward Hub account.",
};

export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
      <section className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl shadow-slate-950">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400/10 text-3xl">
          ✉️
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-cyan-400">
          One more step
        </p>

        <h1 className="mt-3 text-3xl font-bold text-white">
          Check your email
        </h1>

        <p className="mt-4 leading-7 text-slate-300">
          Ownward Hub sent you a confirmation link. Open the email and select the
          link to activate your account.
        </p>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-5 text-left">
          <h2 className="font-semibold text-white">
            Did not receive the email?
          </h2>

          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li>• Check your spam or junk folder.</li>
            <li>• Make sure you entered the correct email address.</li>
            <li>• Allow a few minutes for the email to arrive.</li>
          </ul>
        </div>

        <Link
          href="/login"
          className="mt-8 inline-block rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Return to login
        </Link>

        <Link
          href="/"
          className="mt-5 block text-sm font-semibold text-slate-400 hover:text-white"
        >
          Return to the Ownward Hub homepage
        </Link>
      </section>
    </main>
  );
}
