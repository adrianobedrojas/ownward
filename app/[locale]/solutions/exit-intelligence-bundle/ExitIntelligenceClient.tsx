"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExitIntelligenceData, ExitRisk, BuyerLensEntry, ValueDriver } from "@/lib/exit-intelligence/types";
import type { CategoryResult, ActionPlanItem } from "@/lib/sale-readiness/engine";

// ─── i18n strings ─────────────────────────────────────────────────────────────

const T = {
  en: {
    title: "Exit Intelligence Bundle",
    subtitle: "A unified command center for your exit intelligence.",
    freeBadge: "Free",
    lastUpdated: "Last updated",
    noBusinessTitle: "No Business Yet",
    noBusinessDesc: "Add your business to start building exit intelligence.",
    addBusiness: "Add Business",
    selectBusiness: "Select Business",
    noReadiness: "No sale readiness assessment yet.",
    runReadiness: "Run Sale Readiness Assessment",
    noValuation: "No linked valuation report yet.",
    runValuation: "Run Valuation",
    saleReadiness: "Sale Readiness",
    valuationPosition: "Valuation Position",
    confidence: "Valuation Confidence",
    primaryConstraint: "Primary Exit Constraint",
    defensive: "Defensive",
    expected: "Expected",
    strategic: "Strategic",
    readinessMatrix: "Value × Readiness Matrix",
    matrixDisclaimer: "This matrix is a planning visualization only — not a certified assessment.",
    matrixAreas: {
      buildFoundation: "Build Foundation",
      strengthenEvidence: "Strengthen Evidence",
      prepareMarket: "Prepare for Market",
      strongerExit: "Stronger Exit Position",
    },
    categoryExplorer: "Readiness Category Explorer",
    missingEvidence: "Missing Evidence",
    recommendedAction: "Recommended Action",
    riskRadar: "Risk Radar",
    noRisks: "No significant risks identified.",
    buyerLens: "Buyer Lens",
    buyerLensUnavailable: "Buyer Lens requires a detailed or enhanced valuation report.",
    planningAssumption: "Planning assumption only — not a guaranteed outcome.",
    valueDna: "Value DNA & Drivers",
    actionPlan: "30/60/90-Day Action Plan",
    day30: "Next 30 Days",
    day60: "Next 60 Days",
    day90: "Next 90 Days",
    noActions: "No actions for this period yet.",
    timelineEstimate: "Estimated timeline to market readiness",
    timelineDisclaimer: "This is an estimate, not a guarantee.",
    moveNeedle: "What Could Move the Needle",
    dataCompleteness: "Data Completeness & Next Steps",
    completeSaleReadiness: "Complete your sale readiness assessment",
    completeValuation: "Run your first valuation",
    disclaimer: "Planning and educational intelligence only. Not legal, tax, accounting, brokerage, investment, or certified valuation advice.",
    score: "Score",
    stage: "Stage",
    delta: "vs. previous",
    confidence_pct: "Confidence",
    expandDetails: "Show details",
    collapseDetails: "Hide details",
    source: "Source",
    severity: "Severity",
    action: "Action",
    positive: "Strength",
    negative: "Risk",
    optimistic: "Optimistic",
    realistic: "Realistic",
    conservative: "Conservative",
    months: "months",
    printBrief: "Print Executive Brief",
    refreshSuggestion: "Your core intelligence is complete. Consider refreshing assessments periodically.",
  },
  es: {
    title: "Paquete de Inteligencia de Salida",
    subtitle: "Un centro de comando unificado para tu inteligencia de salida.",
    freeBadge: "Gratis",
    lastUpdated: "Última actualización",
    noBusinessTitle: "Aún no tienes un negocio",
    noBusinessDesc: "Agrega tu negocio para comenzar a construir inteligencia de salida.",
    addBusiness: "Agregar Negocio",
    selectBusiness: "Seleccionar Negocio",
    noReadiness: "Aún no hay evaluación de preparación para venta.",
    runReadiness: "Realizar Evaluación de Preparación para Venta",
    noValuation: "Aún no hay reporte de valuación vinculado.",
    runValuation: "Realizar Valuación",
    saleReadiness: "Preparación para Venta",
    valuationPosition: "Posición de Valuación",
    confidence: "Confianza en Valuación",
    primaryConstraint: "Restricción Principal de Salida",
    defensive: "Defensivo",
    expected: "Esperado",
    strategic: "Estratégico",
    readinessMatrix: "Matriz Valor × Preparación",
    matrixDisclaimer: "Esta matriz es solo una visualización de planificación, no una evaluación certificada.",
    matrixAreas: {
      buildFoundation: "Construir Base",
      strengthenEvidence: "Fortalecer Evidencia",
      prepareMarket: "Preparar para el Mercado",
      strongerExit: "Posición de Salida Más Fuerte",
    },
    categoryExplorer: "Explorador de Categorías de Preparación",
    missingEvidence: "Evidencia Faltante",
    recommendedAction: "Acción Recomendada",
    riskRadar: "Radar de Riesgos",
    noRisks: "No se identificaron riesgos significativos.",
    buyerLens: "Perspectiva del Comprador",
    buyerLensUnavailable: "La perspectiva del comprador requiere un reporte de valuación detallado o mejorado.",
    planningAssumption: "Solo supuesto de planificación — no un resultado garantizado.",
    valueDna: "ADN de Valor y Conductores",
    actionPlan: "Plan de Acción 30/60/90 Días",
    day30: "Próximos 30 Días",
    day60: "Próximos 60 Días",
    day90: "Próximos 90 Días",
    noActions: "No hay acciones para este período aún.",
    timelineEstimate: "Tiempo estimado para estar listo para el mercado",
    timelineDisclaimer: "Esto es una estimación, no una garantía.",
    moveNeedle: "Qué Podría Marcar la Diferencia",
    dataCompleteness: "Completitud de Datos y Próximos Pasos",
    completeSaleReadiness: "Completa tu evaluación de preparación para venta",
    completeValuation: "Realiza tu primera valuación",
    disclaimer: "Inteligencia de planificación y educativa únicamente. No es asesoramiento legal, fiscal, contable, de corretaje, de inversión ni una valuación certificada.",
    score: "Puntuación",
    stage: "Etapa",
    delta: "vs. anterior",
    confidence_pct: "Confianza",
    expandDetails: "Mostrar detalles",
    collapseDetails: "Ocultar detalles",
    source: "Fuente",
    severity: "Severidad",
    action: "Acción",
    positive: "Fortaleza",
    negative: "Riesgo",
    optimistic: "Optimista",
    realistic: "Realista",
    conservative: "Conservador",
    months: "meses",
    printBrief: "Imprimir Resumen Ejecutivo",
    refreshSuggestion: "Tu inteligencia principal está completa. Considera actualizar las evaluaciones periódicamente.",
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number | null, currency = "USD"): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function pct(value: number): string {
  return `${Math.round(value)}%`;
}

function severityBadge(severity: ExitRisk["severity"]): string {
  const map: Record<ExitRisk["severity"], string> = {
    critical: "bg-rose-900/40 text-rose-400 border-rose-700/40",
    high: "bg-orange-900/40 text-orange-400 border-orange-700/40",
    medium: "bg-amber-900/40 text-amber-400 border-amber-700/40",
    low: "bg-slate-800 text-slate-400 border-slate-700",
  };
  return map[severity] ?? map.low;
}

function riskBg(riskLevel: string): string {
  const map: Record<string, string> = {
    critical: "bg-rose-500",
    high: "bg-orange-500",
    medium: "bg-amber-500",
    low: "bg-emerald-500",
    none: "bg-slate-600",
  };
  return map[riskLevel] ?? "bg-slate-600";
}

function stageBadge(stage: string): string {
  const map: Record<string, string> = {
    early_preparation: "bg-rose-900/40 text-rose-400",
    building_readiness: "bg-amber-900/40 text-amber-400",
    approaching_market: "bg-cyan-900/40 text-cyan-400",
    buyer_ready: "bg-emerald-900/40 text-emerald-400",
  };
  return map[stage] ?? "bg-slate-800 text-slate-400";
}

function stageLabel(stage: string, locale: "en" | "es"): string {
  const labels: Record<string, { en: string; es: string }> = {
    early_preparation: { en: "Early Preparation", es: "Preparación Temprana" },
    building_readiness: { en: "Building Readiness", es: "Construyendo Preparación" },
    approaching_market: { en: "Approaching Market", es: "Acercándose al Mercado" },
    buyer_ready: { en: "Buyer-Ready", es: "Listo para Comprador" },
  };
  return labels[stage]?.[locale] ?? stage;
}

function sourceLabel(source: ExitRisk["source"], locale: "en" | "es"): string {
  const labels: Record<ExitRisk["source"], { en: string; es: string }> = {
    readiness: { en: "Sale Readiness", es: "Preparación para Venta" },
    valuation: { en: "Valuation", es: "Valuación" },
    owner_dependence: { en: "Owner Dependence", es: "Dependencia del Dueño" },
    customer_concentration: { en: "Customer Concentration", es: "Concentración de Clientes" },
    missing_evidence: { en: "Missing Evidence", es: "Evidencia Faltante" },
  };
  return labels[source]?.[locale] ?? source;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400 mb-3">
      {children}
    </h2>
  );
}

function SnapshotCard({
  label,
  children,
  highlight = false,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-cyan-500/40 bg-cyan-950/20" : "border-slate-700 bg-slate-800/50"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">{label}</p>
      {children}
    </div>
  );
}

function ExpandableRow({
  summary,
  details,
  expandLabel,
  collapseLabel,
}: {
  summary: React.ReactNode;
  details: React.ReactNode;
  expandLabel: string;
  collapseLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-800 last:border-0 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">{summary}</div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 text-xs text-cyan-400 hover:text-cyan-300 underline"
          aria-expanded={open}
        >
          {open ? collapseLabel : expandLabel}
        </button>
      </div>
      {open && <div className="mt-3 pl-0 text-sm text-slate-300">{details}</div>}
    </div>
  );
}

// ─── Section A: Header ────────────────────────────────────────────────────────

function Header({
  t,
  locale,
  businessName,
  businesses,
  selectedBusinessId,
  lastUpdated,
}: {
  t: (typeof T)["en"];
  locale: "en" | "es";
  businessName: string;
  businesses: { id: string; name: string }[];
  selectedBusinessId: string;
  lastUpdated: string | null;
}) {
  const router = useRouter();

  return (
    <div className="mb-8 print:mb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
            {t.title}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{businessName}</h1>
          <p className="mt-1 text-sm text-slate-400">{t.subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-emerald-900/40 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-700/40">
            {t.freeBadge}
          </span>
          {lastUpdated && (
            <p className="text-xs text-slate-500">
              {t.lastUpdated}: {new Date(lastUpdated).toLocaleDateString(locale === "es" ? "es-MX" : "en-US")}
            </p>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="text-xs text-slate-400 underline hover:text-white print:hidden"
          >
            {t.printBrief}
          </button>
        </div>
      </div>

      {businesses.length > 1 && (
        <div className="mt-4 flex items-center gap-3 print:hidden">
          <label htmlFor="biz-select" className="text-sm text-slate-400 shrink-0">
            {t.selectBusiness}:
          </label>
          <select
            id="biz-select"
            value={selectedBusinessId}
            onChange={(e) => {
              router.push(`?businessId=${e.target.value}`);
            }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 print:hidden">
        <p className="text-xs text-amber-200">{t.disclaimer}</p>
      </div>
    </div>
  );
}

// ─── Section B: Executive Snapshot ───────────────────────────────────────────

function ExecutiveSnapshot({
  t,
  locale,
  data,
}: {
  t: (typeof T)["en"];
  locale: "en" | "es";
  data: ExitIntelligenceData;
}) {
  const sr = data.saleReadiness;
  const val = data.valuation;

  const weakestCat = sr
    ? data.saleReadiness?.categories.find((c) => c.category === sr.weakestCategory)
    : null;

  return (
    <SectionCard>
      <SectionTitle>{locale === "es" ? "Resumen Ejecutivo" : "Executive Snapshot"}</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Sale readiness */}
        <SnapshotCard label={t.saleReadiness}>
          {sr ? (
            <>
              <p className="text-3xl font-bold text-white">{pct(sr.overallScore)}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${stageBadge(sr.stage)}`}>
                {stageLabel(sr.stage, locale)}
              </span>
              {sr.deltaFromPrevious !== null && (
                <p className={`mt-1 text-xs ${sr.deltaFromPrevious >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {sr.deltaFromPrevious >= 0 ? "+" : ""}{sr.deltaFromPrevious.toFixed(1)} {t.delta}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">{t.noReadiness}</p>
          )}
        </SnapshotCard>

        {/* Valuation position */}
        <SnapshotCard label={t.valuationPosition} highlight>
          {val ? (
            <>
              <p className="text-2xl font-bold text-cyan-300">{fmt(val.expectedValue, val.currency)}</p>
              <p className="text-xs text-slate-400">{t.expected}</p>
              <div className="mt-2 flex gap-3 text-xs text-slate-400">
                <span>{t.defensive}: {fmt(val.defensiveValue, val.currency)}</span>
                <span>{t.strategic}: {fmt(val.strategicValue, val.currency)}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">{t.noValuation}</p>
          )}
        </SnapshotCard>

        {/* Confidence */}
        <SnapshotCard label={t.confidence}>
          {val?.confidenceScore != null ? (
            <>
              <p className="text-3xl font-bold text-white">{pct(val.confidenceScore)}</p>
              <p className="text-xs text-slate-400 mt-1">
                {locale === "es"
                  ? "Basado en la completitud de los datos proporcionados."
                  : "Based on completeness of provided data."}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">{t.noValuation}</p>
          )}
        </SnapshotCard>

        {/* Primary constraint */}
        <SnapshotCard label={t.primaryConstraint}>
          {weakestCat ? (
            <>
              <p className="text-sm font-semibold text-white">{weakestCat.label}</p>
              <p className="text-xs text-slate-400 mt-1">{pct(weakestCat.score)} {t.score}</p>
              <p className="text-xs text-slate-400">{weakestCat.recommendedAction}</p>
            </>
          ) : (
            <p className="text-sm text-slate-500">—</p>
          )}
        </SnapshotCard>
      </div>
    </SectionCard>
  );
}

// ─── Section C: Value × Readiness Matrix ──────────────────────────────────────

function ReadinessMatrix({
  t,
  locale,
  data,
}: {
  t: (typeof T)["en"];
  locale: "en" | "es";
  data: ExitIntelligenceData;
}) {
  const srScore = data.saleReadiness?.overallScore ?? null;
  const confScore = data.valuation?.confidenceScore ?? null;

  const xPct = srScore !== null ? srScore : 0;
  const yPct = confScore !== null ? confScore : 0;

  const hasData = srScore !== null || confScore !== null;

  return (
    <SectionCard>
      <SectionTitle>{t.readinessMatrix}</SectionTitle>
      <div
        className="relative mt-2 rounded-xl border border-slate-700 bg-slate-950 overflow-hidden"
        style={{ paddingBottom: "56.25%" }}
        role="img"
        aria-label={t.readinessMatrix}
      >
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <div className="flex items-end justify-start p-3 border-r border-b border-slate-800">
            <span className="text-xs text-slate-500">{t.matrixAreas.buildFoundation}</span>
          </div>
          <div className="flex items-end justify-end p-3 border-b border-slate-800">
            <span className="text-xs text-slate-500">{t.matrixAreas.prepareMarket}</span>
          </div>
          <div className="flex items-start justify-start p-3 border-r border-slate-800">
            <span className="text-xs text-slate-500">{t.matrixAreas.strengthenEvidence}</span>
          </div>
          <div className="flex items-start justify-end p-3">
            <span className="text-xs text-slate-400 font-semibold">{t.matrixAreas.strongerExit}</span>
          </div>
        </div>

        {/* Axes labels */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs text-slate-500">
          {t.saleReadiness} →
        </div>
        <div
          className="absolute left-1 top-1/2 -translate-y-1/2 text-xs text-slate-500"
          style={{ writingMode: "vertical-rl", transform: "translateY(-50%) rotate(180deg)" }}
        >
          {t.confidence} →
        </div>

        {/* Business marker */}
        {hasData && (
          <div
            className="absolute w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-lg"
            style={{
              left: `calc(${xPct}% - 8px)`,
              bottom: `calc(${yPct}% - 8px)`,
              transition: "all 0.3s",
            }}
            title={`${t.saleReadiness}: ${xPct}%, ${t.confidence}: ${yPct}%`}
          />
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500 italic">{t.matrixDisclaimer}</p>
    </SectionCard>
  );
}

// ─── Section D: Category Explorer ────────────────────────────────────────────

function CategoryExplorer({
  t,
  locale,
  categories,
  weakestCategory,
}: {
  t: (typeof T)["en"];
  locale: "en" | "es";
  categories: CategoryResult[];
  weakestCategory: string;
}) {
  if (!categories.length) return null;

  const sorted = [...categories].sort((a, b) => a.score - b.score);

  return (
    <SectionCard>
      <SectionTitle>{t.categoryExplorer}</SectionTitle>
      <div>
        {sorted.map((cat) => (
          <ExpandableRow
            key={cat.category}
            expandLabel={t.expandDetails}
            collapseLabel={t.collapseDetails}
            summary={
              <div className="flex items-center gap-3 flex-wrap">
                <div className={`w-2 h-2 rounded-full ${riskBg(cat.riskLevel)}`} />
                <span className={`text-sm font-semibold ${cat.category === weakestCategory ? "text-rose-300" : "text-white"}`}>
                  {cat.label}
                  {cat.category === weakestCategory && (
                    <span className="ml-2 text-xs text-rose-400 font-normal">(weakest)</span>
                  )}
                </span>
                <div className="flex items-center gap-2 ml-auto text-xs text-slate-400">
                  <div className="w-24 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan-500"
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>
                  <span>{pct(cat.score)}</span>
                  <span className={`rounded-full px-2 py-0.5 border ${severityBadge(cat.riskLevel as ExitRisk["severity"])}`}>
                    {cat.riskLevel}
                  </span>
                  {cat.missingEvidence.length > 0 && (
                    <span className="text-slate-500">{cat.missingEvidence.length} missing</span>
                  )}
                </div>
              </div>
            }
            details={
              <div className="space-y-2">
                <div className="flex gap-4 text-xs text-slate-400">
                  <span>{t.confidence_pct}: {pct(cat.confidence)}</span>
                </div>
                <p className="text-sm text-slate-300">
                  <span className="font-semibold text-slate-400">{t.recommendedAction}: </span>
                  {cat.recommendedAction}
                </p>
                {cat.missingEvidence.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-1">{t.missingEvidence}:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {cat.missingEvidence.map((ev) => (
                        <li key={ev} className="text-xs text-slate-400">{ev}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            }
          />
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Section E: Risk Radar ────────────────────────────────────────────────────

function RiskRadar({
  t,
  locale,
  risks,
}: {
  t: (typeof T)["en"];
  locale: "en" | "es";
  risks: ExitRisk[];
}) {
  if (!risks.length) {
    return (
      <SectionCard>
        <SectionTitle>{t.riskRadar}</SectionTitle>
        <p className="text-sm text-slate-400">{t.noRisks}</p>
      </SectionCard>
    );
  }

  const topRisks = risks.slice(0, 15);

  return (
    <SectionCard>
      <SectionTitle>{t.riskRadar}</SectionTitle>
      <div className="space-y-0">
        {topRisks.map((risk, i) => (
          <ExpandableRow
            key={i}
            expandLabel={t.expandDetails}
            collapseLabel={t.collapseDetails}
            summary={
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded-full px-2 py-0.5 text-xs border ${severityBadge(risk.severity)}`}>
                  {risk.severity}
                </span>
                <span className="text-sm text-white">{risk.issue}</span>
                <span className="text-xs text-slate-500 ml-auto">{sourceLabel(risk.source, locale)}</span>
              </div>
            }
            details={
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-slate-400">{t.action}: </span>
                {risk.action}
              </p>
            }
          />
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Section F: Buyer Lens ────────────────────────────────────────────────────

function BuyerLensSection({
  t,
  buyerLens,
}: {
  t: (typeof T)["en"];
  buyerLens: BuyerLensEntry[] | null;
}) {
  const [activeTab, setActiveTab] = useState(0);

  if (!buyerLens || buyerLens.length === 0) {
    return (
      <SectionCard>
        <SectionTitle>{t.buyerLens}</SectionTitle>
        <p className="text-sm text-slate-400">{t.buyerLensUnavailable}</p>
      </SectionCard>
    );
  }

  const active = buyerLens[activeTab] ?? buyerLens[0];

  return (
    <SectionCard>
      <SectionTitle>{t.buyerLens}</SectionTitle>
      <div className="flex gap-2 mb-4 flex-wrap" role="tablist">
        {buyerLens.map((entry, i) => (
          <button
            key={entry.buyerType}
            type="button"
            role="tab"
            aria-selected={i === activeTab}
            onClick={() => setActiveTab(i)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              i === activeTab
                ? "bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/40"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {entry.buyerTypeLabel}
          </button>
        ))}
      </div>
      <div className="space-y-3" role="tabpanel">
        <p className="text-sm text-slate-300">{active.interpretation}</p>
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
          <p className="text-xs text-slate-500 mb-1">
            {active.likelyMultipleRange
              ? `Multiple range: ${active.likelyMultipleRange} — ${t.planningAssumption}`
              : t.planningAssumption}
          </p>
        </div>
        {active.primaryConcerns.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-1">Primary concerns:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {active.primaryConcerns.map((c) => (
                <li key={c} className="text-xs text-slate-400">{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Section G: Value Drivers ─────────────────────────────────────────────────

function ValueDriversSection({
  t,
  drivers,
}: {
  t: (typeof T)["en"];
  drivers: ValueDriver[];
}) {
  if (!drivers.length) return null;

  return (
    <SectionCard>
      <SectionTitle>{t.valueDna}</SectionTitle>
      <div className="space-y-2">
        {drivers.map((d, i) => (
          <div key={i} className="flex items-start gap-3">
            <span
              className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                d.direction === "positive"
                  ? "bg-emerald-900/40 text-emerald-400"
                  : "bg-rose-900/40 text-rose-400"
              }`}
            >
              {d.direction === "positive" ? t.positive : t.negative}
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{d.label}</p>
              {d.description && <p className="text-xs text-slate-400 mt-0.5">{d.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Section H: 30/60/90 Action Plan ─────────────────────────────────────────

function ActionPlanSection({
  t,
  locale,
  plan,
  estimatedMonths,
}: {
  t: (typeof T)["en"];
  locale: "en" | "es";
  plan: ActionPlanItem[];
  estimatedMonths: ExitIntelligenceData["estimatedMonths"];
}) {
  const [activeTab, setActiveTab] = useState<30 | 60 | 90>(30);

  const periodsMap = {
    30: plan.filter((a) => a.horizon === 30),
    60: plan.filter((a) => a.horizon === 60),
    90: plan.filter((a) => a.horizon === 90),
  };

  const tabs: { label: string; value: 30 | 60 | 90 }[] = [
    { label: t.day30, value: 30 },
    { label: t.day60, value: 60 },
    { label: t.day90, value: 90 },
  ];

  const activeActions = periodsMap[activeTab];

  return (
    <SectionCard>
      <SectionTitle>{t.actionPlan}</SectionTitle>

      {estimatedMonths && (
        <div className="mb-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
          <p className="text-xs text-slate-400">
            {t.timelineEstimate}:{" "}
            <span className="text-white font-semibold">
              {estimatedMonths.minMonths}–{estimatedMonths.maxMonths} {t.months}
            </span>
          </p>
          <p className="text-xs text-slate-500 mt-0.5 italic">{t.timelineDisclaimer}</p>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              activeTab === tab.value
                ? "bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/40"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="space-y-0">
        {activeActions.length === 0 ? (
          <p className="text-sm text-slate-500">{t.noActions}</p>
        ) : (
          activeActions.map((item, i) => (
            <div key={i} className="border-b border-slate-800 last:border-0 py-3">
              <div className="flex items-start gap-3">
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    item.priority === "critical"
                      ? "bg-rose-900/40 text-rose-400"
                      : item.priority === "high"
                      ? "bg-amber-900/40 text-amber-400"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {item.priority}
                </span>
                <div>
                  <p className="text-xs text-slate-500">{item.category}</p>
                  <p className="text-sm text-white">{item.action}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}

// ─── Section I: Move the Needle ───────────────────────────────────────────────

function MoveNeedleSection({
  t,
  valueBridgeScenarios,
  recommendedActions,
}: {
  t: (typeof T)["en"];
  valueBridgeScenarios: unknown[] | null;
  recommendedActions: unknown[] | null;
}) {
  const scenarios = valueBridgeScenarios as Array<Record<string, unknown>> | null;
  const actions = recommendedActions as Array<Record<string, unknown>> | null;

  if (!scenarios?.length && !actions?.length) return null;

  return (
    <SectionCard>
      <SectionTitle>{t.moveNeedle}</SectionTitle>
      <div className="space-y-3">
        {scenarios?.slice(0, 5).map((s, i) => (
          <ExpandableRow
            key={i}
            expandLabel={t.expandDetails}
            collapseLabel={t.collapseDetails}
            summary={
              <p className="text-sm font-semibold text-white">
                {(s.issue ?? s.label ?? s.title ?? `Scenario ${i + 1}`) as string}
              </p>
            }
            details={
              <div className="space-y-1">
                {s.improvement && (
                  <p className="text-sm text-slate-300">
                    <span className="font-semibold text-slate-400">Improvement: </span>
                    {s.improvement as string}
                  </p>
                )}
                {s.whyItMatters && (
                  <p className="text-sm text-slate-300">
                    <span className="font-semibold text-slate-400">Why it matters: </span>
                    {s.whyItMatters as string}
                  </p>
                )}
              </div>
            }
          />
        ))}
        {actions?.slice(0, 5).map((a, i) => (
          <div key={`a-${i}`} className="border-b border-slate-800 last:border-0 py-2">
            <p className="text-sm text-slate-300">{(a.action ?? a.description ?? a) as string}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Section J: Data Completeness ────────────────────────────────────────────

function DataCompleteness({
  t,
  locale,
  data,
}: {
  t: (typeof T)["en"];
  locale: "en" | "es";
  data: ExitIntelligenceData;
}) {
  const hasSR = !!data.saleReadiness;
  const hasVal = !!data.valuation;
  const coreComplete = hasSR && hasVal;

  return (
    <SectionCard>
      <SectionTitle>{t.dataCompleteness}</SectionTitle>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${hasSR ? "bg-emerald-500" : "bg-slate-600"}`} />
          <p className="text-sm text-slate-300">
            {locale === "es" ? "Evaluación de preparación para venta" : "Sale readiness assessment"}
          </p>
          {!hasSR && (
            <a
              href={`/${locale}/sale-readiness`}
              className="ml-auto text-xs text-cyan-400 underline hover:text-cyan-300"
            >
              {t.completeSaleReadiness}
            </a>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${hasVal ? "bg-emerald-500" : "bg-slate-600"}`} />
          <p className="text-sm text-slate-300">
            {locale === "es" ? "Reporte de valuación vinculado" : "Linked valuation report"}
          </p>
          {!hasVal && (
            <a
              href={`/${locale}/valuation?businessId=${data.businessId}&mode=detailed`}
              className="ml-auto text-xs text-cyan-400 underline hover:text-cyan-300"
            >
              {t.completeValuation}
            </a>
          )}
        </div>
        {coreComplete && (
          <div className="rounded-lg border border-emerald-700/40 bg-emerald-950/20 p-3 mt-2">
            <p className="text-sm text-emerald-400">{t.refreshSuggestion}</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

interface Props {
  locale: "en" | "es";
  businesses: { id: string; name: string; created_at: string }[];
  selectedBusinessId: string | null;
  exitData: ExitIntelligenceData | null;
}

export default function ExitIntelligenceClient({
  locale,
  businesses,
  selectedBusinessId,
  exitData,
}: Props) {
  const t = T[locale];

  // Empty state: no businesses
  if (businesses.length === 0 || !selectedBusinessId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400 mb-2">{t.title}</p>
          <h1 className="text-2xl font-bold text-white">{t.noBusinessTitle}</h1>
          <p className="mt-2 text-sm text-slate-400">{t.noBusinessDesc}</p>
          <a
            href={`/${locale}/business/new`}
            className="mt-6 inline-block rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 transition"
          >
            {t.addBusiness}
          </a>
        </div>
      </main>
    );
  }

  const data = exitData!;
  const businessName = businesses.find((b) => b.id === selectedBusinessId)?.name ?? "";
  const lastUpdated =
    data.valuation?.updatedAt ?? data.saleReadiness?.scoredAt ?? null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 print:py-4">
      <style>{`@media print { .print\\:hidden { display: none !important; } }`}</style>

      <Header
        t={t}
        locale={locale}
        businessName={businessName}
        businesses={businesses}
        selectedBusinessId={selectedBusinessId}
        lastUpdated={lastUpdated}
      />

      <div className="space-y-6">
        <ExecutiveSnapshot t={t} locale={locale} data={data} />

        <ReadinessMatrix t={t} locale={locale} data={data} />

        {data.saleReadiness && (
          <CategoryExplorer
            t={t}
            locale={locale}
            categories={data.saleReadiness.categories}
            weakestCategory={data.saleReadiness.weakestCategory}
          />
        )}

        <RiskRadar t={t} locale={locale} risks={data.risks} />

        <BuyerLensSection t={t} buyerLens={data.buyerLens} />

        {data.valueDrivers.length > 0 && (
          <ValueDriversSection t={t} drivers={data.valueDrivers} />
        )}

        {data.saleReadiness && (
          <ActionPlanSection
            t={t}
            locale={locale}
            plan={data.actionPlan}
            estimatedMonths={data.estimatedMonths}
          />
        )}

        <MoveNeedleSection
          t={t}
          valueBridgeScenarios={data.valueBridgeScenarios}
          recommendedActions={data.recommendedActions}
        />

        <DataCompleteness t={t} locale={locale} data={data} />
      </div>
    </main>
  );
}
