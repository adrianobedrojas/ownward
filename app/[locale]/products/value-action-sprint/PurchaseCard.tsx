"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PurchaseCardProps {
  productKey: string;
  isAuthenticated: boolean;
  alreadyPurchased: boolean;
  loginHref: string;
  productsHref: string;
  labels: {
    purchaseCta: string;
    loginCta: string;
    alreadyPurchased: string;
    openProduct: string;
    processing: string;
    errorPrefix: string;
  };
}

export default function PurchaseCard({
  productKey,
  isAuthenticated,
  alreadyPurchased,
  loginHref,
  productsHref,
  labels,
}: PurchaseCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (alreadyPurchased) {
    return (
      <a
        href={productsHref}
        className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white hover:bg-indigo-500 transition-colors"
      >
        {labels.openProduct}
      </a>
    );
  }

  if (!isAuthenticated) {
    return (
      <a
        href={loginHref}
        className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white hover:bg-indigo-500 transition-colors"
      >
        {labels.loginCta}
      </a>
    );
  }

  async function handlePurchase() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/commerce/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productKey }),
      });

      const data = (await res.json()) as { url?: string; error?: string; redirectTo?: string };

      if (!res.ok) {
        if (data.redirectTo) {
          router.push(data.redirectTo);
          return;
        }
        setErrorMessage(data.error ?? "Unknown error");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        onClick={handlePurchase}
        disabled={loading}
        className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? labels.processing : labels.purchaseCta}
      </button>
      {errorMessage && (
        <p className="text-sm text-red-400" role="alert">
          {labels.errorPrefix} {errorMessage}
        </p>
      )}
    </div>
  );
}
