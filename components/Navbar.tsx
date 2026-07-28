"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  {
    name: "Buy",
    href: "/marketplace",
  },
  {
    name: "Sell",
    href: "/sell",
  },
  {
    name: "Features",
    href: "/#features",
  },
  {
    name: "Pricing",
    href: "/pricing",
  },
  {
    name: "Guide",
    href: "/guide",
  },
];

export default function Navbar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href.startsWith("/#")) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6"
      >
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 font-bold text-white shadow-lg shadow-blue-950">
            O
          </span>

          <span>
            <span className="block font-bold text-white">
              Ownward
            </span>

            <span className="block text-xs text-slate-400">
              Run · Grow · Buy · Sell
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

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            Log in
          </Link>

          <Link
            href="/signup"
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Create account
          </Link>
        </div>

        <details className="relative lg:hidden" suppressHydrationWarning>
          <summary className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Menu
          </summary>

          <div className="absolute right-0 mt-3 w-72 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl">
            <div className="space-y-1">
              {navigation.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-lg px-3 py-3 text-sm font-medium transition ${
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

            <div className="mt-3 grid gap-2">
              <Link
                href="/login"
                className="block rounded-lg border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className="block rounded-lg bg-cyan-400 px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Create account
              </Link>
            </div>
          </div>
        </details>
      </nav>
    </header>
  );
}