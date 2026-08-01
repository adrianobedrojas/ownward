"use client";

import { useEffect } from "react";

export default function TasksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-rose-200">
          Tasks unavailable
        </p>
        <h1 className="mt-3 text-2xl font-bold text-white">
          We hit a problem while loading your tasks.
        </h1>
        <p className="mt-3 text-slate-300">
          Please retry. If this keeps happening, refresh the page or sign in again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Retry
        </button>
      </div>
    </section>
  );
}
