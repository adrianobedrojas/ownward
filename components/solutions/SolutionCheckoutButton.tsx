"use client";

import { useEffect, useMemo, useState } from "react";
import { trackGoogleAnalyticsConversion } from "@/lib/google-analytics";

type TargetOption = {
  id: string;
  label: string;
  description?: string;
  eligible?: boolean;
  reason?: string;
};

type Props = {
  productKey: string;
  locale: "en" | "es";
  ctaBehavior: "checkout" | "coming_soon" | "included" | "contact" | "manage";
  status: "active" | "planned" | "coming_soon" | "included" | "contact";
  requiredTargetType: "none" | "listing" | "business" | "deal_room" | "transaction" | "acquisition_target";
  /** Pre-resolved target ID for contextual checkout (skips selection UI). */
  targetId?: string;
  /** Server-provided eligible options for selection-based checkout. */
  targetOptions?: TargetOption[];
  /** Localized label for the target selection group. */
  targetSelectLabel?: string;
  /** Localized placeholder for the target select control. */
  targetSelectPlaceholder?: string;
  /** Localized message shown when no eligible target exists. */
  noEligibleTargetMessage?: string;
  /** Localized link href shown when no eligible target exists. */
  noEligibleTargetHref?: string;
  /** Localized link text shown when no eligible target exists. */
  noEligibleTargetLinkText?: string;
  /** Callback fired when the checkout button is clicked (before the network call). */
  onStartCheckout?: () => void;
};

type TemplateOption = {
  key: string;
  name: string;
  description: string;
  suitableBusinessType: string;
  workflowsIncluded: number;
  tasksIncluded: number;
  clientStageOutline: string[];
  kpiCategories: string[];
  documentPlaceholders: string[];
  sopPlaceholders: string[];
  previewCategories: string[];
};

export default function SolutionCheckoutButton({
  productKey,
  locale,
  ctaBehavior,
  status,
  requiredTargetType,
  targetId: contextTargetId,
  targetOptions: serverTargetOptions,
  targetSelectLabel,
  targetSelectPlaceholder,
  noEligibleTargetMessage,
  noEligibleTargetHref,
  noEligibleTargetLinkText,
  onStartCheckout,
}: Props) {
  const [loading, setLoading] = useState(false);
  // When a contextTargetId is provided server-side, we use it automatically.
  // Otherwise the user selects from a dropdown.
  const [selectedTargetId, setSelectedTargetId] = useState(contextTargetId ?? "");
  const [targetLoading, setTargetLoading] = useState(
    // Only use client-side loading when no server-side options were passed and target is required
    !serverTargetOptions && ctaBehavior === "checkout" && status === "active" && requiredTargetType !== "none"
  );
  const [targetRoute, setTargetRoute] = useState<string | null>(null);
  const [targetIncludedMessage, setTargetIncludedMessage] = useState<string | null>(null);
  const [templateKey, setTemplateKey] = useState("");
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
  // Use server-provided options when available, otherwise fetched client-side
  const [fetchedTargetOptions, setFetchedTargetOptions] = useState<TargetOption[]>([]);
  const targetOptions = serverTargetOptions ?? fetchedTargetOptions;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const labels = useMemo(() => {
    if (locale === "es") {
      return {
        buy: "Comprar",
        processing: "Redirigiendo…",
        targetLabel: "ID del objetivo",
        targetHint: "Selecciona un objetivo",
        templateLabel: "Plantilla",
        templateHint: "Selecciona una plantilla aprobada",
        templatePlaceholder: "Selecciona una plantilla",
        templateUnavailable: "No hay plantillas habilitadas ahora.",
        setupPreviewTitle: "Vista previa de lo que se creará",
        setupBusinessLabel: "Negocio",
        setupTemplateType: "Tipo sugerido",
        setupWorkflows: "Flujos incluidos",
        setupTasks: "Tareas incluidas",
        setupClientStages: "Etapas de clientes",
        setupKpis: "Categorías KPI",
        setupDocuments: "Checklist documental",
        setupSops: "Plantillas SOP",
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
      templateLabel: "Template",
      templateHint: "Select an approved template",
      templatePlaceholder: "Select a template",
      templateUnavailable: "No templates are available right now.",
      setupPreviewTitle: "Preview what will be created",
      setupBusinessLabel: "Business",
      setupTemplateType: "Best fit",
      setupWorkflows: "Workflows included",
      setupTasks: "Tasks included",
      setupClientStages: "Client stages",
      setupKpis: "KPI categories",
      setupDocuments: "Document checklist",
      setupSops: "SOP placeholders",
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
    // Skip client-side fetch when server already provided options
    if (serverTargetOptions) return;
    if (!isCheckoutActive || requiredTargetType === "none") {
      return;
    }

    let active = true;

    const qs = new URLSearchParams({ productKey, locale });
    fetch(`/api/commerce/targets?${qs.toString()}`)
      .then(async (res) => {
        const payload = (await res.json()) as {
          options?: TargetOption[];
          templates?: TemplateOption[];
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
          setFetchedTargetOptions([]);
          return;
        }

        setFetchedTargetOptions(payload.options ?? []);
        setTemplateOptions(payload.templates ?? []);
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
  }, [productKey, locale, requiredTargetType, labels.fallbackError, isCheckoutActive, serverTargetOptions]);

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
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);
    onStartCheckout?.();

    try {
      const res = await fetch("/api/commerce/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productKey,
          locale,
          targetId: selectedTargetId.trim() || undefined,
          templateKey: templateKey.trim() || undefined,
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

  // Derived: is target selection blocked because server has no eligible options?
  const isTargetBlocked =
    requiredTargetType !== "none" &&
    !contextTargetId &&
    serverTargetOptions !== undefined &&
    serverTargetOptions.filter((o) => o.eligible !== false).length === 0;

  const isCheckoutDisabled =
    loading ||
    targetLoading ||
    isTargetBlocked ||
    (requiredTargetType !== "none" && !contextTargetId && !selectedTargetId) ||
    (productKey === "business_in_a_box" && !templateKey);

  return (
    <div className="space-y-2">
      {requiredTargetType !== "none" && !contextTargetId ? (
        <label className="block text-xs text-slate-400" aria-label={targetSelectLabel ?? labels.targetLabel}>
          {productKey === "business_in_a_box" ? labels.setupBusinessLabel : (targetSelectLabel ?? labels.targetLabel)}
          {targetLoading ? (
            <p className="mt-1 text-xs text-slate-500">{labels.targetLoading}</p>
          ) : serverTargetOptions !== undefined && serverTargetOptions.filter((o) => o.eligible !== false).length === 0 ? (
            // Blocked state: server provided options but none are eligible
            <div className="mt-2 rounded-md border border-amber-700/40 bg-amber-950/20 p-3 text-xs text-amber-200">
              <p>{noEligibleTargetMessage ?? labels.targetUnavailable}</p>
              {noEligibleTargetHref ? (
                <a
                  href={noEligibleTargetHref}
                  className="mt-1 inline-block text-cyan-300 hover:text-cyan-200 underline"
                >
                  {noEligibleTargetLinkText ?? labels.manage}
                </a>
              ) : null}
            </div>
          ) : (
            <>
              <select
                value={selectedTargetId}
                onChange={(event) => setSelectedTargetId(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
              >
                <option value="">{targetSelectPlaceholder ?? labels.targetPlaceholder}</option>
                {targetOptions.map((option) => (
                  <option key={option.id} value={option.eligible !== false ? option.id : ""} disabled={option.eligible === false}>
                    {option.label}
                    {option.eligible !== false ? "" : ` — ${option.reason ?? labels.targetUnavailable}`}
                  </option>
                ))}
              </select>
              {targetIncludedMessage ? (
                <p className="mt-1 text-xs text-cyan-300">{targetIncludedMessage}</p>
              ) : targetOptions.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">{noEligibleTargetMessage ?? labels.targetUnavailable}</p>
              ) : null}
            </>
          )}
        </label>
      ) : null}

      {productKey === "business_in_a_box" ? (
        <label className="block text-xs text-slate-400" aria-label={labels.templateLabel}>
          {labels.templateLabel}
          <select
            value={templateKey}
            onChange={(event) => setTemplateKey(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="">{labels.templatePlaceholder}</option>
            {templateOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">{labels.templateHint}</p>
          {templateOptions.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">{labels.templateUnavailable}</p>
          ) : null}
        </label>
      ) : null}

      {productKey === "business_in_a_box" && templateKey ? (
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-300">
          {(() => {
            const template = templateOptions.find((option) => option.key === templateKey);
            if (!template) {
              return null;
            }
            return (
              <>
                <p className="font-semibold text-slate-100">{labels.setupPreviewTitle}</p>
                <p className="mt-1 text-slate-300">{template.description}</p>
                <p className="mt-1 text-slate-400">
                  {labels.setupTemplateType}: {template.suitableBusinessType}
                </p>
                <p className="mt-2 text-slate-400">
                  {labels.setupWorkflows}: {template.workflowsIncluded} · {labels.setupTasks}: {template.tasksIncluded}
                </p>
                <p className="mt-2 text-slate-400">{labels.setupClientStages}: {template.clientStageOutline.join(" · ")}</p>
                <p className="mt-2 text-slate-400">{labels.setupKpis}: {template.kpiCategories.slice(0, 5).join(" · ")}</p>
                <p className="mt-2 text-slate-400">{labels.setupDocuments}: {template.documentPlaceholders.slice(0, 4).join(" · ")}</p>
                <p className="mt-2 text-slate-400">{labels.setupSops}: {template.sopPlaceholders.slice(0, 4).join(" · ")}</p>
              </>
            );
          })()}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={isCheckoutDisabled}
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
