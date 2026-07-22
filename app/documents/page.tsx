import Link from "next/link";

const vaultFolders = [
  {
    name: "Formation",
    description: "Registration and business formation records.",
  },
  {
    name: "Customers",
    description: "Documents connected to customers and projects.",
  },
  {
    name: "Agreements",
    description: "Contracts and signed agreements.",
  },
  {
    name: "Quotes",
    description: "Quotes and business proposals.",
  },
  {
    name: "Invoices",
    description: "Sent and received invoices.",
  },
  {
    name: "Receipts",
    description: "Receipts and proof of payment.",
  },
  {
    name: "Expenses",
    description: "Bills and expense records.",
  },
  {
    name: "Taxes",
    description: "Tax documents and supporting records.",
  },
  {
    name: "Marketing",
    description: "Logos, advertisements, and promotional files.",
  },
];

export default function DocumentsPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Business workspace
          </p>

          <h1 className="mt-2 text-3xl font-bold text-white">
            Business Vault
          </h1>

          <p className="mt-2 text-slate-400">
            Securely organize your important business documents and records.
          </p>
        </div>

        <Link
          href="/upload"
          className="rounded-lg bg-cyan-400 px-5 py-3 text-center font-semibold text-slate-950 hover:bg-cyan-300"
        >
          + Upload document
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">
            Total documents
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            0
          </p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">
            Storage used
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            0 MB
          </p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">
            Storage available
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-400">
            500 MB
          </p>
        </article>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-white">
          Vault folders
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vaultFolders.map((folder) => (
            <article
              key={folder.name}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-400"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">
                  {folder.name}
                </h3>

                <span className="text-sm text-slate-500">
                  0 files
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-400">
                {folder.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-16 text-center">
        <h2 className="text-xl font-semibold text-white">
          Your vault is empty
        </h2>

        <p className="mx-auto mt-2 max-w-md text-slate-400">
          Upload your first business document and organize it inside one of
          your vault folders.
        </p>

        <Link
          href="/upload"
          className="mt-5 inline-block rounded-lg border border-slate-700 px-5 py-3 font-semibold text-white hover:border-cyan-400"
        >
          Upload your first document
        </Link>
      </section>
    </section>
  );
}
