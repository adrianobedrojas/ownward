import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import { createElement } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ownward",
    template: "%s | Ownward",
  },
  description:
    "Run, grow, buy, and sell small businesses in one connected platform.",
};

function OwnwardMark() {
  return (
    <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-blue-950/30">
      <span className="absolute inset-0 rounded-xl border border-white/10" />
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/90">
        <span className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-[10%] -translate-y-[65%] rotate-45 rounded-tl-full border-r-2 border-t-2 border-white/90" />
        <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-cyan-100" />
      </span>
    </span>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <Navbar logo={<OwnwardMark />} />
        <main>{children}</main>
      </body>
    </html>
  );
}
