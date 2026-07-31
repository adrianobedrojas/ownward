"use client";

import { useState } from "react";

interface FeaturedListingButtonProps {
  listingId: string;
}

export default function FeaturedListingButton({
  listingId,
}: FeaturedListingButtonProps) {
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
        {loading ? "Redirecting…" : "Feature listing"}
      </button>
      {error && (
        <p className="text-xs text-rose-400">{error}</p>
      )}
    </div>
  );
}
