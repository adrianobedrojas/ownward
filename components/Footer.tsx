import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} Ownward Hub. All rights reserved.</p>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-4">
          <Link href="/privacy" className="font-medium text-slate-300 transition hover:text-cyan-300">
            Privacy Policy
          </Link>
          <Link
            href="/privacy-choices"
            className="font-medium text-slate-300 transition hover:text-cyan-300"
          >
            Privacy Choices
          </Link>
        </nav>
      </div>
    </footer>
  );
}
