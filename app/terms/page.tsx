import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Ownward Hub",
  description: "Review the terms that govern the use of Ownward Hub services.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          Terms of Service
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
          Ownward Hub Terms of Service
        </h1>
        <p className="mt-4 text-slate-300">
          By creating or using an Ownward Hub account, you agree to use the
          platform lawfully, protect account credentials, and avoid misuse that
          harms others or the service.
        </p>
        <p className="mt-4 text-slate-300">
          You are responsible for information you provide, business content you
          publish, and compliance with applicable laws in your jurisdiction.
        </p>
        <p className="mt-4 text-slate-300">
          Ownward may update these terms from time to time. Continued use after
          updates means you accept the revised terms.
        </p>
        <p className="mt-6 text-slate-300">
          For data handling details, review our{" "}
          <Link href="/privacy" className="font-semibold text-cyan-300 hover:text-cyan-200">
            Privacy Policy
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
