"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";

const navigation = [
  {
    name: "Buy",
    href: "/buy",
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

interface NavbarClientProps {
  signedIn: boolean;
}

export default function NavbarClient({
  signedIn,
}: NavbarClientProps) {
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function isActive(href: string) {
    if (href.startsWith("/#")) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function closeMobileMenu() {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6"
      >
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Image
            src="/ownward-icon.png"
            alt="Ownward Hub"
            width={36}
            height={36}
            priority
          />

          <span>
            <span className="block font-bold text-white">
              Ownward
            </span>

            <span className="block text-xs text-slate-400">
              Run · Grow · Buy · Sell
            </span>
          </span>
        </Link>

        {/* Desktop Navigation */}
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

        {/* Desktop Actions */}
        <div className="hidden items-center gap-2 lg:flex">
          {signedIn ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Dashboard
              </Link>

              <Link
                href="/documents"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Vault
              </Link>

              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Mobile Dropdown Menu */}
        <details
          ref={detailsRef}
          className="relative lg:hidden"
          suppressHydrationWarning
        >
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
                    onClick={closeMobileMenu}
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
              {signedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={closeMobileMenu}
                    className="block rounded-lg border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Dashboard
                  </Link>

                  <Link
                    href="/documents"
                    onClick={closeMobileMenu}
                    className="block rounded-lg border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Vault
                  </Link>

                  <form action="/auth/signout" method="post">
                    <button
                      type="submit"
                      onClick={closeMobileMenu}
                      className="block w-full rounded-lg border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={closeMobileMenu}
                    className="block rounded-lg border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Log in
                  </Link>

                  <Link
                    href="/signup"
                    onClick={closeMobileMenu}
                    className="block rounded-lg bg-cyan-400 px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Create account
                  </Link>
                </>
              )}
            </div>
          </div>
        </details>
      </nav>
    </header>
  );
}
