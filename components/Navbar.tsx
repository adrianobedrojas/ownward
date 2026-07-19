"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Customers", href: "/customers" },
  { name: "Tasks", href: "/tasks" },
  { name: "Invoices", href: "/invoices" },
  { name: "Vault", href: "/documents" },
  { name: "Money", href: "/money" },
];

export default function Navbar() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <nav
        className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6"
        aria-label="Main navigation"
      >
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 font-bold text-white shadow-lg shadow-blue-950">
            LV
          </span>

          <span>
            <span className="block text-lg font-bold tracking-tight text-white">
              LifeVault
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Business
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navigation.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-cyan-400/10 text-cyan-300"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/invoices"
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            + New invoice
          </Link>

          <button
            type="button"
            aria-label="Open account menu"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-sm font-semibold text-white"
          >
            AR
          </button>
        </div>

        <details className="group relative lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-center rounded-lg border border-slate-700 p-2 text-slate-200 hover:bg-slate-800">
            <span className="sr-only">Open navigation menu</span>
            <span className="space-y-1">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          </summary>

          <div className="absolute right-0 mt-3 w-64 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl">
            <div className="flex flex-col gap-1">
              {navigation.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      active
                        ? "bg-cyan-400/10 text-cyan-300"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}

              <Link
                href="/invoices"
                className="mt-2 rounded-lg bg-cyan-400 px-3 py-2 text-center text-sm font-semibold text-slate-950"
              >
                + New invoice
              </Link>
            </div>
          </div>
        </details>
      </nav>
    </header>
  );
}