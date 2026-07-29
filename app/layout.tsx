import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ownward",
    template: "%s | Ownward",
  },
  description:
    "Run, grow, buy, and sell small businesses in one connected platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
