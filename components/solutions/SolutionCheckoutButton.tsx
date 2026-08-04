"use client";

import { useMemo, useState } from "react";
import { trackGoogleAnalyticsConversion } from "@/lib/google-analytics";

type Props = {
  productKey: string;
  locale: "en" | "es";
  ctaBehavior: "checkout" | "coming_soon" | "included" | "contact" | "manage";
  status: "active" | "planned" | "coming_soon" | "included" | "contact";
  requiredTargetType: "none" | "listing" | "business" | "deal_room" | "transaction" | "acquisition_target";
};

export default function SolutionCheckoutButton({
  productKey,
  locale,
  ctaBehavior,
  status,
  requiredTargetType,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const labels = useMemo(() => {
    if (locale === "es") {
      return {
        buy: "Comprar",
        processing: "Redirigiendo…",
        targetLabel: "ID del objetivo",
        targetHint: "Requerido para esta solución",
        comingSoon: "Próximamente",
        included: "Incluido",
        contact: "Contáctanos",
        manage: "Gestionar",
        fallbackError: "No se pudo iniciar el pago.",
      };
    }

    return {
      buy: "Buy now",
      processing: "Redirecting…",
      targetLabel: "Target ID",
      targetHint: "Required for this solution",
      comingSoon: "Coming soon",
      included: "Included",
      contact: "Contact us",
      manage: "Manage",
      fallbackError: "Unable to start checkout.",
    };
  }, [locale]);

  if (ctaBehavior !== "checkout" || status !== "active") {
    const text =
      ctaBehavior === "included"
        ? labels.included
        : ctaBehavior === "contact"
          ? labels.contact
          : ctaBehavior === "manage"
            ? labels.manage
            : labels.comingSoon;

    return (
      <span className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-300">
        {text}
      </span>
    );
  }

  async function handleCheckout() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/commerce/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productKey,
          locale,
          targetId: targetId.trim() || undefined,
        }),
      });

      const data = (await res.json()) as { url?: string; error?: string; redirectTo?: string };

      if (!res.ok) {
        if (data.redirectTo) {
          window.location.assign(data.redirectTo);
          return;
        }
        setErrorMessage(data.error ?? labels.fallbackError);
        return;
      }

      if (data.url) {
        trackGoogleAnalyticsConversion(
          "begin_checkout",
          {
            checkout_type: "one_time_product",
            product_key: productKey,
            target_type: requiredTargetType,
          },
          { dedupeKey: `begin_checkout:product:${productKey}:${data.url}` },
        );
        window.location.assign(data.url);
      }
    } catch {
      setErrorMessage(labels.fallbackError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {requiredTargetType !== "none" ? (
        <label className="block text-xs text-slate-400">
          {labels.targetLabel}
          <input
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            placeholder={labels.targetHint}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
          />
        </label>
      ) : null}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className="inline-flex items-center rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
      >
        {loading ? labels.processing : labels.buy}
      </button>

      {errorMessage ? <p className="text-xs text-rose-300">{errorMessage}</p> : null}
    </div>
  );
}
