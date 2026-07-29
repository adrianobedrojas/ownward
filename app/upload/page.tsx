import Link from "next/link";
import { uploadDocument } from "./action";
import { DEFAULT_DOCUMENT_FOLDER } from "@/lib/documents";

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          Ownward Vault
        </p>

        <h1 className="mt-2 text-3xl font-bold text-white">
          Upload document
        </h1>

        <p className="mt-2 text-slate-400">
          Add a business file and choose where it should be organized in your secure vault.
        </p>
      </div>

      {errorMessage && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Upload failed ({errorMessage}). Please check your file and try again.
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <form action={uploadDocument}>
            <div>
              <label
                htmlFor="document"
                className="block text-sm font-semibold text-white"
              >
                Choose a file
              </label>

              <input
                id="document"
                name="document"
                type="file"
                required
                className="mt-3 block w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:font-semibold file:text-slate-950"
              />
            </div>

            <div className="mt-6">
              <label
                htmlFor="folder"
                className="block text-sm font-semibold text-white"
              >
                Vault folder
              </label>

              <select
                id="folder"
                name="folder"
                defaultValue={DEFAULT_DOCUMENT_FOLDER}
                required
                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300"
              >
                <option value="" disabled>
                  Select a folder
                </option>
                <option value="formation">Formation</option>
                <option value="customers">Customers</option>
                <option value="agreements">Agreements</option>
                <option value="quotes">Quotes</option>
                <option value="invoices">Invoices</option>
                <option value="receipts">Receipts</option>
                <option value="expenses">Expenses</option>
                <option value="taxes">Taxes</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>

            <div className="mt-6">
              <label
                htmlFor="notes"
                className="block text-sm font-semibold text-white"
              >
                Notes
              </label>

              <textarea
                id="notes"
                name="notes"
                rows={4}
                placeholder="Add an optional description of this document."
                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 placeholder:text-slate-600"
              />
            </div>

            <button
              type="submit"
              className="mt-6 w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Upload document
            </button>

            <p className="mt-3 text-center text-xs text-slate-500">
              Files are securely stored in your private Supabase vault storage.
            </p>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-semibold text-white">
              Storage
            </h2>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-2 bg-cyan-400" />
            </div>

            <p className="mt-3 text-sm text-slate-400">
              Secure Supabase storage connected
            </p>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-semibold text-white">
              Upload guidance
            </h2>

            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li>Choose the correct folder.</li>
              <li>Do not upload files you do not own.</li>
              <li>Check that sensitive information is necessary.</li>
              <li>Keep an independent backup of critical records.</li>
            </ul>
          </section>

          <Link
            href="/documents"
            className="block text-center text-sm font-semibold text-cyan-400 hover:text-cyan-300"
          >
            Return to Ownward Vault
          </Link>
        </aside>
      </div>
    </section>
  );
}
