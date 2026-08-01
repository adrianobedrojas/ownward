export default function TasksLoading() {
  return (
    <section className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="space-y-3">
          <div className="h-4 w-24 rounded bg-slate-800" />
          <div className="h-9 w-40 rounded bg-slate-800" />
          <div className="h-4 w-80 max-w-full rounded bg-slate-800" />
        </div>
        <div className="h-12 w-32 rounded-lg bg-slate-800" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="h-4 w-24 rounded bg-slate-800" />
            <div className="mt-3 h-9 w-16 rounded bg-slate-800" />
          </article>
        ))}
      </div>

      <div className="mt-8 flex gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-9 w-24 rounded-lg bg-slate-800" />
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="h-5 w-52 max-w-full rounded bg-slate-800" />
            <div className="mt-3 h-4 w-full rounded bg-slate-800" />
            <div className="mt-2 h-4 w-2/3 rounded bg-slate-800" />
          </article>
        ))}
      </div>
    </section>
  );
}
