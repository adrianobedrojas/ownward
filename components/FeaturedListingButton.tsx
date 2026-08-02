"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

interface FeaturedListingButtonProps {
  listingId: string;
}

export default function FeaturedListingButton({
  listingId,
}: FeaturedListingButtonProps) {
  const locale = useLocale();
  const isSpanish = locale === "es";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFeature() {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/featured-listings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });

      const data: { url?: string; error?: string } = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout. Please try again.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleFeature}
        disabled={loading}
        className="text-xs font-semibold text-amber-400 transition hover:text-amber-300 disabled:opacity-50"
      >
        {loading ? (isSpanish ? "Redirigiendo…" : "Redirecting…") : (isSpanish ? "Destacar publicación" : "Feature listing")}
      </button>
      <p className="max-w-xs text-[11px] leading-5 text-slate-500">
        {isSpanish
          ? "Compra única promocional salvo indicación distinta en checkout. No se garantizan vistas, contactos u ofertas. "
          : "One-time promotional purchase unless checkout states otherwise. Views, leads, and offers are not guaranteed. "}
        <Link href="/terms" className="text-cyan-300 hover:text-cyan-200">{isSpanish ? "Términos" : "Terms"}</Link>
        {" · "}
        <Link href="/privacy" className="text-cyan-300 hover:text-cyan-200">{isSpanish ? "Privacidad" : "Privacy"}</Link>
      </p>
      {error && (
        <p className="text-xs text-rose-400">{error}</p>
      )}
    </div>
  );
}
