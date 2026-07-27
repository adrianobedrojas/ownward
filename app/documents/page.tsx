// app/documents/page.tsx
import Link from "next/link";
import { createClient } from '@/lib/supabase/server';

const vaultFolders = [
  { name: "Formation", description: "Registration and business formation records." },
  { name: "Customers", description: "Documents connected to customers and projects." },
  { name: "Agreements", description: "Contracts and signed agreements." },
  { name: "Quotes", description: "Quotes and business proposals." },
  { name: "Invoices", description: "Sent and received invoices." },
  { name: "Receipts", description: "Receipts and proof of payment." },
  { name: "Expenses", description: "Bills and expense records." },
  { name: "Taxes", description: "Tax documents and supporting records." },
  { name: "Marketing", description: "Logos, advertisements, and promotional files." },
];

export default async function DocumentsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  let documents: any[] = [];
  if (user) {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) documents = data;
  }

  const totalDocuments = documents.length;
  const totalBytes = documents.reduce((acc, doc) => acc + (doc.size || 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
  const maxMB = 500;

  // Calculate file counts per folder
  const folderCounts: Record<string, number> = {};
  documents.forEach((doc) => {
    const folder = doc.folder || 'Formation';
    folderCounts[folder] = (folderCounts[folder] || 0) + 1;
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 text-slate-100">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Ownward Vault
          </p>

          <h1 className="mt-2 text-3xl font-bold text-white">
            Vault
          </h1>

          <p className="mt-2 text-slate-400">
            Securely organize your important business documents and records.
          </p>
        </div>

        <Link
          href="/upload"
          className="rounded-lg bg-cyan-400 px-5 py-3 text-center font-semibold text-slate-950 hover:bg-cyan-300 transition"
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
            {totalDocuments}
          </p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">
            Storage used
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {totalMB} MB
          </p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">
            Storage available
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-400">
            {maxMB} MB
          </p>
        </article>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-white">
          Vault folders
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vaultFolders.map((folder) => {
            const count = folderCounts[folder.name] || 0;
            return (
              <article
                key={folder.name}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-400"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">
                    {folder.name}
                  </h3>

                  <span className="text-sm text-slate-500">
                    {count} {count === 1 ? 'file' : 'files'}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-400">
                  {folder.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {totalDocuments === 0 ? (
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
            className="mt-5 inline-block rounded-lg border border-slate-700 px-5 py-3 font-semibold text-white hover:border-cyan-400 transition"
          >
            Upload your first document
          </Link>
        </section>
      ) : (
        <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Recent Documents
          </h2>

          <div className="divide-y divide-slate-800">
            {documents.map((doc) => (
              <div key={doc.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-white">{doc.name}</span>
                  <span className="ml-3 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-cyan-400">
                    {doc.folder}
                  </span>
                </div>

                <span className="text-slate-500">
                  {new Date(doc.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
