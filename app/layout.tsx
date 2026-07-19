import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LifeVault Business",
    template: "%s | LifeVault Business",
  },
  description:
    "Organize customers, tasks, invoices, money, and business documents.",
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