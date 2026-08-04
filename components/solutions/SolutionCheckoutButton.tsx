"use client";

import { useMemo, useState } from "react";

type Props = {
  productKey: string;
  locale: "en" | "es";
  ctaBehavior: "checkout" | "coming_soon" | "included" | "contact" | "manage";
  status: "active" | "planned" | "coming_soon" | "included" | "contact";
  requiredTargetType: "none" | "listing" | "business" | "deal_room" | "transaction" | "acquisition_target";
  targetId?: string;
  targetOptions?: Array<{ id: string; label: string; description?: string }>;
  onStartCheckout?: () => void;
};

export default function SolutionCheckoutButton({
  productKey,
  locale,
  ctaBehavior,
  status,
  requiredTargetType,
  targetId,
  targetOptions = [],
  onStartCheckout,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string>(targetId ?? targetOptions[0]?.id ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const labels = useMemo(() => {
    if (locale === "es") {
      return {
        buy: "Comprar",
        processing: "Redirigiendo…",
        targetLabel: "Selecciona objetivo",
        targetHint: "Debes elegir un objetivo elegible",
        missingTarget: "Selecciona un objetivo elegible para continuar.",
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
      targetLabel: "Select target",
      targetHint: "You must choose an eligible target",
      missingTarget: "Select an eligible target to continue.",
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
    const effectiveTargetId = targetId ?? selectedTarget;
    if (requiredTargetType !== "none" && !effectiveTargetId) {
      setErrorMessage(labels.missingTarget);
      return;
    }

    onStartCheckout?.();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/commerce/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productKey,
          locale,
          targetId: effectiveTargetId || undefined,
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
      {requiredTargetType !== "none" && !targetId && targetOptions.length > 0 ? (
        <label className="block text-xs text-slate-400">
          {labels.targetLabel}
          <select
            value={selectedTarget}
            onChange={(event) => setSelectedTarget(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="">{labels.targetHint}</option>
            {targetOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {targetOptions.find((option) => option.id === selectedTarget)?.description ? (
            <span className="mt-1 block text-[11px] text-slate-500">
              {targetOptions.find((option) => option.id === selectedTarget)?.description}
            </span>
          ) : null}
        </label>
      ) : requiredTargetType !== "none" && !targetId ? (
        <p className="text-xs text-slate-500">{labels.missingTarget}</p>
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
