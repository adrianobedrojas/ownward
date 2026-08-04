"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [targetLoading, setTargetLoading] = useState(
    ctaBehavior === "checkout" && status === "active" && requiredTargetType !== "none"
  );
  const [targetRoute, setTargetRoute] = useState<string | null>(null);
  const [targetIncludedMessage, setTargetIncludedMessage] = useState<string | null>(null);
  const [targetOptions, setTargetOptions] = useState<
    Array<{ id: string; label: string; description?: string; eligible: boolean; reason?: string }>
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const labels = useMemo(() => {
    if (locale === "es") {
      return {
        buy: "Comprar",
        processing: "Redirigiendo…",
        targetLabel: "ID del objetivo",
        targetHint: "Selecciona un objetivo",
        targetPlaceholder: "Selecciona una opción",
        targetLoading: "Cargando opciones…",
        targetUnavailable: "No hay objetivos elegibles por ahora.",
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
      targetLabel: "Target",
      targetHint: "Select a target",
      targetPlaceholder: "Select an option",
      targetLoading: "Loading options…",
      targetUnavailable: "No eligible targets available right now.",
      comingSoon: "Coming soon",
      included: "Included",
      contact: "Contact us",
      manage: "Manage",
      fallbackError: "Unable to start checkout.",
    };
  }, [locale]);

  const isCheckoutActive = ctaBehavior === "checkout" && status === "active";

  useEffect(() => {
    if (!isCheckoutActive || requiredTargetType === "none") {
      return;
    }

    let active = true;

    const qs = new URLSearchParams({ productKey, locale });
    fetch(`/api/commerce/targets?${qs.toString()}`)
      .then(async (res) => {
        const payload = (await res.json()) as {
          options?: Array<{ id: string; label: string; description?: string; eligible: boolean; reason?: string }>;
          includedMessage?: string;
          route?: string;
          error?: string;
          redirectTo?: string;
        };

        if (!active) return;

        if (!res.ok) {
          if (payload.redirectTo) {
            window.location.assign(payload.redirectTo);
            return;
          }
          setErrorMessage(payload.error ?? labels.fallbackError);
          setTargetOptions([]);
          return;
        }

        setTargetOptions(payload.options ?? []);
        setTargetIncludedMessage(payload.includedMessage ?? null);
        setTargetRoute(payload.route ?? null);
      })
      .catch(() => {
        if (!active) return;
        setErrorMessage(labels.fallbackError);
      })
      .finally(() => {
        if (!active) return;
        setTargetLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productKey, locale, requiredTargetType, labels.fallbackError, isCheckoutActive]);

  if (!isCheckoutActive) {
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
        const route = (data as { route?: string }).route;
        if (route) {
          setErrorMessage(`${data.error ?? labels.fallbackError}`);
          setTargetRoute(route);
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
        <label className="block text-xs text-slate-400" aria-label={labels.targetLabel}>
          {labels.targetLabel}
          {targetLoading ? (
            <p className="mt-1 text-xs text-slate-500">{labels.targetLoading}</p>
          ) : (
            <>
              <select
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
              >
                <option value="">{labels.targetPlaceholder}</option>
                {targetOptions.map((option) => (
                  <option key={option.id} value={option.eligible ? option.id : ""} disabled={!option.eligible}>
                    {option.label}
                    {option.eligible ? "" : ` — ${option.reason ?? labels.targetUnavailable}`}
                  </option>
                ))}
              </select>
              {targetIncludedMessage ? (
                <p className="mt-1 text-xs text-cyan-300">{targetIncludedMessage}</p>
              ) : targetOptions.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">{labels.targetUnavailable}</p>
              ) : null}
            </>
          )}
        </label>
      ) : null}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading || targetLoading || (requiredTargetType !== "none" && !targetId)}
        className="inline-flex items-center rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
      >
        {loading ? labels.processing : labels.buy}
      </button>

      {errorMessage ? <p className="text-xs text-rose-300">{errorMessage}</p> : null}
      {targetRoute ? (
        <a href={targetRoute} className="text-xs text-cyan-300 hover:text-cyan-200">
          {labels.manage}
        </a>
      ) : null}
    </div>
  );
}
