"use client";

import { useCallback, useState } from "react";
import { Link } from '@/i18n/navigation';
import { deleteEstimate, saveEstimate } from "./actions";
import type { ValuationEstimate } from "./types";

interface ValuationCalculatorProps {
  isAuthenticated: boolean;
  savedEstimates: ValuationEstimate[];
}

interface FormState {
  annualRevenue: string;
  baseEarnings: string;
  ownerCompensation: string;
  interestAddback: string;
  depreciationAddback: string;
  amortizationAddback: string;
  onetimeExpenses: string;
  nonoperatingIncome: string;
  lowMultiple: string;
  baseMultiple: string;
  highMultiple: string;
}

const DEFAULT_FORM: FormState = {
  annualRevenue: "",
  baseEarnings: "",
  ownerCompensation: "0",
  interestAddback: "0",
  depreciationAddback: "0",
  amortizationAddback: "0",
  onetimeExpenses: "0",
  nonoperatingIncome: "0",
  lowMultiple: "2.0",
  baseMultiple: "3.0",
  highMultiple: "4.0",
};

interface CalcResult {
  normalizedEarnings: number;
  lowEstimate: number;
  baseEstimate: number;
  highEstimate: number;
}

interface ValidationErrors {
  baseEarnings?: string;
  lowMultiple?: string;
  baseMultiple?: string;
  highMultiple?: string;
  ownerCompensation?: string;
  interestAddback?: string;
  depreciationAddback?: string;
  amortizationAddback?: string;
  onetimeExpenses?: string;
  nonoperatingIncome?: string;
}

function parseNum(s: string): number | null {
  const v = parseFloat(s.trim().replace(/,/g, ""));
  return Number.isFinite(v) ? v : null;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function validateForm(f: FormState): ValidationErrors {
  const errors: ValidationErrors = {};

  const base = parseNum(f.baseEarnings);
  if (f.baseEarnings.trim() !== "" && base === null) {
    errors.baseEarnings = "Must be a valid number.";
  }

  const low = parseNum(f.lowMultiple);
  const mid = parseNum(f.baseMultiple);
  const high = parseNum(f.highMultiple);

  if (low === null || low <= 0) errors.lowMultiple = "Must be greater than zero.";
  if (mid === null || mid <= 0) errors.baseMultiple = "Must be greater than zero.";
  if (high === null || high <= 0) errors.highMultiple = "Must be greater than zero.";
  if (low !== null && mid !== null && low > mid) errors.lowMultiple = "Cannot exceed base multiple.";
  if (mid !== null && high !== null && mid > high) errors.baseMultiple = "Cannot exceed high multiple.";

  for (const [key, val] of [
    ["ownerCompensation", f.ownerCompensation],
    ["interestAddback", f.interestAddback],
    ["depreciationAddback", f.depreciationAddback],
    ["amortizationAddback", f.amortizationAddback],
    ["onetimeExpenses", f.onetimeExpenses],
    ["nonoperatingIncome", f.nonoperatingIncome],
  ] as const) {
    const v = parseNum(val);
    if (v === null) (errors as Record<string, string>)[key] = "Must be a valid number.";
    else if (v < 0) (errors as Record<string, string>)[key] = "Cannot be negative.";
  }

  return errors;
}

function calcResult(f: FormState): CalcResult | null {
  const errors = validateForm(f);
  if (Object.keys(errors).length > 0) return null;
  if (!f.baseEarnings.trim()) return null;

  const base = parseNum(f.baseEarnings);
  const ownerComp = parseNum(f.ownerCompensation) ?? 0;
  const interest = parseNum(f.interestAddback) ?? 0;
  const dep = parseNum(f.depreciationAddback) ?? 0;
  const amort = parseNum(f.amortizationAddback) ?? 0;
  const onetime = parseNum(f.onetimeExpenses) ?? 0;
  const nonop = parseNum(f.nonoperatingIncome) ?? 0;
  const low = parseNum(f.lowMultiple);
  const mid = parseNum(f.baseMultiple);
  const high = parseNum(f.highMultiple);

  if (base === null || low === null || mid === null || high === null) return null;

  const normalized = base + ownerComp + interest + dep + amort + onetime - nonop;

  return {
    normalizedEarnings: normalized,
    lowEstimate: normalized * low,
    baseEstimate: normalized * mid,
    highEstimate: normalized * high,
  };
}

function estimateToForm(e: ValuationEstimate): FormState {
  return {
    annualRevenue: e.annual_revenue != null ? String(e.annual_revenue) : "",
    baseEarnings: e.base_earnings != null ? String(e.base_earnings) : "",
    ownerCompensation: String(e.owner_compensation ?? 0),
    interestAddback: String(e.interest_addback ?? 0),
    depreciationAddback: String(e.depreciation_addback ?? 0),
    amortizationAddback: String(e.amortization_addback ?? 0),
    onetimeExpenses: String(e.onetime_expenses ?? 0),
    nonoperatingIncome: String(e.nonoperating_income ?? 0),
    lowMultiple: String(e.low_multiple ?? 2),
    baseMultiple: String(e.base_multiple ?? 3),
    highMultiple: String(e.high_multiple ?? 4),
  };
}

const QUALITATIVE_FACTORS = [
  { label: "Revenue stability", detail: "Consistent, predictable revenue tends to increase value." },
  { label: "Customer concentration", detail: "Heavy reliance on a single customer is a risk that may lower value." },
  { label: "Recurring revenue", detail: "Subscriptions, retainers, and contracts increase predictability and value." },
  { label: "Owner dependence", detail: "A business that requires the current owner to operate may sell at a discount." },
  { label: "Quality of financial records", detail: "Clean, verifiable financials support a higher and faster sale." },
  { label: "Growth trend", detail: "A growing business often commands a higher multiple than a declining one." },
  { label: "Transferability of operations", detail: "Documented processes and trained staff make a business easier to transfer." },
  { label: "Legal or operational risks", detail: "Unresolved disputes, expired contracts, or compliance issues can reduce value." },
];

export default function ValuationCalculator({ isAuthenticated, savedEstimates: initialEstimates }: ValuationCalculatorProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [result, setResult] = useState<CalcResult | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [estimates, setEstimates] = useState<ValuationEstimate[]>(initialEstimates);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  function calculate() {
    const newErrors = validateForm(form);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setResult(null);
      return;
    }
    setResult(calcResult(form));
  }

  async function handleSave() {
    if (!isAuthenticated) return;
    setSaving(true);
    setSaveFeedback(null);

    const base = parseNum(form.baseEarnings);
    const r = calcResult(form);

    const res = await saveEstimate({
      id: loadedId ?? undefined,
      name: saveName.trim() || "Untitled estimate",
      annualRevenue: parseNum(form.annualRevenue),
      baseEarnings: base,
      ownerCompensation: parseNum(form.ownerCompensation) ?? 0,
      interestAddback: parseNum(form.interestAddback) ?? 0,
      depreciationAddback: parseNum(form.depreciationAddback) ?? 0,
      amortizationAddback: parseNum(form.amortizationAddback) ?? 0,
      onetimeExpenses: parseNum(form.onetimeExpenses) ?? 0,
      nonoperatingIncome: parseNum(form.nonoperatingIncome) ?? 0,
      normalizedEarnings: r?.normalizedEarnings ?? null,
      lowMultiple: parseNum(form.lowMultiple) ?? 2,
      baseMultiple: parseNum(form.baseMultiple) ?? 3,
      highMultiple: parseNum(form.highMultiple) ?? 4,
      lowEstimate: r?.lowEstimate ?? null,
      baseEstimate: r?.baseEstimate ?? null,
      highEstimate: r?.highEstimate ?? null,
    });

    setSaving(false);

    if (!res.success) {
      setSaveFeedback({ type: "error", message: res.message });
      return;
    }

    setSaveFeedback({ type: "success", message: res.message });

    if (res.estimate) {
      setLoadedId(res.estimate.id);
      setEstimates((prev) => {
        const exists = prev.find((e) => e.id === res.estimate!.id);
        return exists ? prev.map((e) => (e.id === res.estimate!.id ? res.estimate! : e)) : [res.estimate!, ...prev];
      });
    }
  }

  function loadEstimate(e: ValuationEstimate) {
    setForm(estimateToForm(e));
    setLoadedId(e.id);
    setSaveName(e.name);
    setErrors({});
    setResult(null);
    setSaveFeedback(null);
    setShowSaved(false);
  }

  async function handleDelete(id: string) {
    const res = await deleteEstimate(id);
    setDeleteConfirmId(null);

    if (!res.success) {
      setSaveFeedback({ type: "error", message: res.message });
      return;
    }

    setEstimates((prev) => prev.filter((e) => e.id !== id));
    if (loadedId === id) {
      setLoadedId(null);
      setForm(DEFAULT_FORM);
      setSaveName("");
    }
    setSaveFeedback({ type: "success", message: "Estimate deleted." });
  }

  function formatDate(d: string) {
    const date = new Date(d);
    return Number.isNaN(date.getTime())
      ? d
      : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Ownward Valuation</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Valuation Scenario Builder</h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">
          Enter your financial figures to build a preliminary earnings-multiple estimate. Adjust the inputs and multiples to explore different scenarios.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
        <p className="font-semibold text-amber-300">Educational preliminary estimate only</p>
        <p className="mt-1 text-sm leading-6 text-slate-300">
          This tool provides a rough estimate for planning purposes. It is not a certified appraisal, professional valuation, fairness opinion, investment recommendation, or guarantee of any sale price. Consult a qualified business broker, accountant, or valuation professional before making any financial or legal decisions.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Main form */}
        <div className="space-y-6">
          {/* Saved estimates toggle */}
          {isAuthenticated && estimates.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <button
                onClick={() => setShowSaved((v) => !v)}
                className="flex w-full items-center justify-between text-sm font-semibold text-white"
              >
                <span>Saved estimates ({estimates.length})</span>
                <span className="text-cyan-400">{showSaved ? "▲ Hide" : "▼ Show"}</span>
              </button>
              {showSaved && (
                <div className="mt-4 space-y-3">
                  {estimates.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
                      {deleteConfirmId === e.id ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-xs text-white">Delete &ldquo;{e.name}&rdquo;?</p>
                          <button onClick={() => handleDelete(e.id)} className="text-xs font-semibold text-red-400 hover:text-red-300">Yes, delete</button>
                          <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{e.name}</p>
                            <p className="text-xs text-slate-500">{formatDate(e.created_at)}</p>
                          </div>
                          <button onClick={() => loadEstimate(e)} className="text-xs font-semibold text-cyan-400 hover:text-cyan-300">Load</button>
                          <button onClick={() => setDeleteConfirmId(e.id)} className="text-xs text-slate-500 hover:text-red-400">Delete</button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Earnings inputs */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-bold text-white">Base earnings</h2>
            <p className="mt-1 text-sm text-slate-400">
              Net income or pre-tax owner earnings — the starting point for normalized earnings.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="v-revenue" className="block text-sm font-semibold text-slate-300">Annual revenue (optional)</label>
                <input
                  id="v-revenue"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={form.annualRevenue}
                  onChange={(e) => setField("annualRevenue", e.target.value)}
                  placeholder="0"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />
              </div>
              <div>
                <label htmlFor="v-base" className="block text-sm font-semibold text-slate-300">
                  Net income / owner earnings <span aria-hidden="true" className="text-red-400">*</span>
                </label>
                <input
                  id="v-base"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={form.baseEarnings}
                  onChange={(e) => setField("baseEarnings", e.target.value)}
                  placeholder="0"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />
                {errors.baseEarnings && <p className="mt-1 text-xs text-red-400">{errors.baseEarnings}</p>}
              </div>
            </div>
          </div>

          {/* Add-backs */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-bold text-white">Add-backs</h2>
            <p className="mt-1 text-sm text-slate-400">
              Amounts added back to arrive at normalized owner earnings. Use 0 for any that do not apply.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                { id: "v-owner-comp", key: "ownerCompensation" as const, label: "Owner compensation" },
                { id: "v-interest", key: "interestAddback" as const, label: "Interest" },
                { id: "v-dep", key: "depreciationAddback" as const, label: "Depreciation" },
                { id: "v-amort", key: "amortizationAddback" as const, label: "Amortization" },
                { id: "v-onetime", key: "onetimeExpenses" as const, label: "One-time expenses" },
              ].map(({ id, key, label }) => (
                <div key={key}>
                  <label htmlFor={id} className="block text-sm font-semibold text-slate-300">{label}</label>
                  <input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    placeholder="0"
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                  />
                  {(errors as Record<string, string>)[key] && (
                    <p className="mt-1 text-xs text-red-400">{(errors as Record<string, string>)[key]}</p>
                  )}
                </div>
              ))}
              <div>
                <label htmlFor="v-nonop" className="block text-sm font-semibold text-slate-300">Non-operating income (subtract)</label>
                <input
                  id="v-nonop"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={form.nonoperatingIncome}
                  onChange={(e) => setField("nonoperatingIncome", e.target.value)}
                  placeholder="0"
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />
                {errors.nonoperatingIncome && <p className="mt-1 text-xs text-red-400">{errors.nonoperatingIncome}</p>}
              </div>
            </div>

            {/* Formula */}
            <div className="mt-5 rounded-lg border border-slate-700 bg-slate-950 p-4 text-xs leading-6 text-slate-400">
              <p className="font-semibold text-slate-300">Normalized earnings formula</p>
              <p className="mt-2">
                Net income / owner earnings<br />
                + Owner compensation<br />
                + Interest<br />
                + Depreciation<br />
                + Amortization<br />
                + One-time expenses<br />
                − Non-operating income<br />
                <span className="font-semibold text-white">= Normalized earnings</span>
              </p>
            </div>
          </div>

          {/* Multiples */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-bold text-white">Valuation multiples</h2>
            <p className="mt-1 text-sm text-slate-400">
              The appropriate multiple depends on industry, size, risk, growth, and other factors. These defaults are editable starting points, not recommendations.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                { id: "v-low-mult", key: "lowMultiple" as const, label: "Low multiple" },
                { id: "v-base-mult", key: "baseMultiple" as const, label: "Base multiple" },
                { id: "v-high-mult", key: "highMultiple" as const, label: "High multiple" },
              ].map(({ id, key, label }) => (
                <div key={key}>
                  <label htmlFor={id} className="block text-sm font-semibold text-slate-300">{label}</label>
                  <input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0.1"
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                  />
                  {(errors as Record<string, string>)[key] && (
                    <p className="mt-1 text-xs text-red-400">{(errors as Record<string, string>)[key]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Calculate button */}
          <button
            type="button"
            onClick={calculate}
            className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Calculate estimate
          </button>

          {/* Results */}
          {result && (
            <div className="rounded-xl border border-cyan-400/30 bg-slate-900 p-6">
              <h2 className="text-lg font-bold text-white">Calculation results</h2>

              {/* Breakdown */}
              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">
                <p className="font-semibold text-slate-300 mb-2">Breakdown</p>
                {[
                  { label: "Base earnings", value: parseNum(form.baseEarnings) },
                  { label: "+ Owner compensation", value: parseNum(form.ownerCompensation) ?? 0 },
                  { label: "+ Interest", value: parseNum(form.interestAddback) ?? 0 },
                  { label: "+ Depreciation", value: parseNum(form.depreciationAddback) ?? 0 },
                  { label: "+ Amortization", value: parseNum(form.amortizationAddback) ?? 0 },
                  { label: "+ One-time expenses", value: parseNum(form.onetimeExpenses) ?? 0 },
                  { label: "− Non-operating income", value: -(parseNum(form.nonoperatingIncome) ?? 0) },
                ].map(({ label, value }) => (
                  value !== 0 && value !== null ? (
                    <div key={label} className="flex justify-between py-0.5">
                      <span>{label}</span>
                      <span className="font-mono text-white">{fmt(value ?? 0)}</span>
                    </div>
                  ) : null
                ))}
                <div className="mt-2 flex justify-between border-t border-slate-700 pt-2 font-bold text-white">
                  <span>Normalized earnings</span>
                  <span className="font-mono">{fmt(result.normalizedEarnings)}</span>
                </div>
              </div>

              {/* Estimates */}
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Low estimate", value: result.lowEstimate, multiple: form.lowMultiple, color: "text-slate-200" },
                  { label: "Base estimate", value: result.baseEstimate, multiple: form.baseMultiple, color: "text-cyan-300" },
                  { label: "High estimate", value: result.highEstimate, multiple: form.highMultiple, color: "text-emerald-300" },
                ].map(({ label, value, multiple, color }) => (
                  <div key={label} className="rounded-lg border border-slate-700 bg-slate-950 p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className={`mt-2 text-2xl font-bold ${color}`}>{fmt(value)}</p>
                    <p className="mt-1 text-xs text-slate-500">{multiple}× normalized earnings</p>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-slate-500">
                These figures are preliminary estimates for planning purposes only. Actual value depends on many additional factors.
              </p>

              {/* Save */}
              {isAuthenticated ? (
                <div className="mt-6 border-t border-slate-800 pt-5">
                  <label htmlFor="estimate-name" className="block text-sm font-semibold text-slate-300">Estimate name</label>
                  <input
                    id="estimate-name"
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="e.g. Base case 2026"
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                  />
                  {saveFeedback && (
                    <div
                      role="status"
                      className={`mt-3 rounded-lg p-3 text-sm font-medium ${
                        saveFeedback.type === "success" ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"
                      }`}
                    >
                      {saveFeedback.message}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-3 rounded-lg bg-cyan-400 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : loadedId ? "Update estimate" : "Save estimate"}
                  </button>
                </div>
              ) : (
                <div className="mt-6 rounded-lg border border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">
                  <Link href="/login" className="font-semibold text-cyan-400 hover:text-cyan-300">Sign in</Link> to save this estimate and revisit it later. Your current inputs will not be saved automatically.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Qualitative factors */}
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Qualitative factors</p>
            <h2 className="mt-2 text-xl font-bold text-white">What may raise or lower value</h2>
            <ul className="mt-5 space-y-4">
              {QUALITATIVE_FACTORS.map((f) => (
                <li key={f.label}>
                  <p className="text-sm font-semibold text-white">{f.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-400">{f.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Sale readiness */}
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold text-white">Thinking about selling?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Use the seller workspace to begin organizing information and preparing a confidential business listing.
            </p>
            <Link
              href="/sell"
              className="mt-5 inline-block rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Prepare to sell
            </Link>
          </section>

          {/* Documents */}
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Sale readiness</p>
            <h2 className="mt-2 text-xl font-bold text-white">Records to prepare</h2>
            <ul className="mt-4 space-y-2">
              {[
                "At least 12 months of financial records",
                "Organized income and expense history",
                "Customer and sales information",
                "Business contracts and agreements",
                "List of equipment and business assets",
                "Documented operating procedures",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xs text-cyan-300">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/documents"
              className="mt-5 inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
            >
              Open Ownward Vault
            </Link>
          </section>
        </aside>
      </div>

      {/* Valuation factors */}
      <section className="mt-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Valuation factors</p>
          <h2 className="mt-2 text-2xl font-bold text-white">What may influence business value</h2>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Financial performance", description: "Revenue, expenses, profit, owner earnings, and the consistency of the business's financial results." },
            { title: "Recurring revenue", description: "Repeat customers, subscriptions, contracts, and predictable sources of future revenue." },
            { title: "Customer concentration", description: "How dependent the business is on one customer or a small group of customers." },
            { title: "Owner dependence", description: "Whether the business can continue operating without the current owner managing every activity." },
            { title: "Business records", description: "The quality of financial statements, contracts, tax records, and operating documentation." },
            { title: "Growth potential", description: "Opportunities to increase customers, expand services, enter new markets, or improve operations." },
          ].map((f) => (
            <article key={f.title} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{f.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="font-semibold text-white">Professional review may be necessary</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          A business&apos;s actual value and selling price can depend on its industry, financial records, assets, liabilities, risks, negotiations, market conditions, and deal structure. Consider consulting a qualified valuation professional, accountant, attorney, or other appropriate advisor before making important decisions.
        </p>
      </section>
    </section>
  );
}
