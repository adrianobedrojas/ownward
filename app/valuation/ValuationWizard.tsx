"use client";

import { useState, useTransition } from "react";
import { saveDraft, calculateReport } from "./actions";
import type { ValuationActionResult } from "./actions";
import type { IndustryKey } from "@/lib/valuation/types";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface FinancialYearData {
  fiscalYear: string;
  revenue: string;
  cogs: string;
  operatingExpenses: string;
  ownerSalary: string;
  ownerBenefits: string;
  depreciation: string;
  amortization: string;
  interest: string;
  oneTimeExpenses: string;
  oneTimeRevenue: string;
}

interface AddBack {
  label: string;
  amount: string;
  direction: "add" | "deduct";
  explanation: string;
}

interface WizardData {
  // Step 1: Business profile
  businessName: string;
  industry: IndustryKey | "";
  yearEstablished: string;
  currency: string;

  // Step 2: Financial years
  financialYears: FinancialYearData[];

  // Step 3: Owner earnings
  ownerWeeklyHours: string;
  replacementManagerSalary: string;
  addBacks: AddBack[];

  // Step 4: Revenue quality
  recurringRevenuePct: string;
  largestCustomerPct: string;
  top5CustomersPct: string;
  contractedRevenuePct: string;
  churnRatePct: string;

  // Step 5: Operations
  hasDocumentedProcedures: boolean;
  hasKeyEmployees: boolean;
  keyEmployeeCount: string;
  hasSystemsAndTechnology: boolean;
  hasProprietaryIP: boolean;

  // Step 6: Assets and evidence
  fairValueOfTangibleAssets: string;
  totalLiabilities: string;
  hasAuditedFinancials: boolean;
  hasTaxReturns: boolean;
  hasCustomerContracts: boolean;
  hasEmployeeAgreements: boolean;
}

// ─────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────

const currentYear = new Date().getFullYear();

const DEFAULT_FINANCIAL_YEARS: FinancialYearData[] = [
  { fiscalYear: String(currentYear - 2), revenue: "", cogs: "", operatingExpenses: "", ownerSalary: "", ownerBenefits: "", depreciation: "", amortization: "", interest: "", oneTimeExpenses: "", oneTimeRevenue: "" },
  { fiscalYear: String(currentYear - 1), revenue: "", cogs: "", operatingExpenses: "", ownerSalary: "", ownerBenefits: "", depreciation: "", amortization: "", interest: "", oneTimeExpenses: "", oneTimeRevenue: "" },
  { fiscalYear: String(currentYear), revenue: "", cogs: "", operatingExpenses: "", ownerSalary: "", ownerBenefits: "", depreciation: "", amortization: "", interest: "", oneTimeExpenses: "", oneTimeRevenue: "" },
];

const DEFAULT_DATA: WizardData = {
  businessName: "",
  industry: "",
  yearEstablished: "",
  currency: "USD",
  financialYears: DEFAULT_FINANCIAL_YEARS,
  ownerWeeklyHours: "",
  replacementManagerSalary: "",
  addBacks: [],
  recurringRevenuePct: "",
  largestCustomerPct: "",
  top5CustomersPct: "",
  contractedRevenuePct: "",
  churnRatePct: "",
  hasDocumentedProcedures: false,
  hasKeyEmployees: false,
  keyEmployeeCount: "0",
  hasSystemsAndTechnology: false,
  hasProprietaryIP: false,
  fairValueOfTangibleAssets: "",
  totalLiabilities: "",
  hasAuditedFinancials: false,
  hasTaxReturns: false,
  hasCustomerContracts: false,
  hasEmployeeAgreements: false,
};

// ─────────────────────────────────────────────
// Step definitions
// ─────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Business profile" },
  { id: 2, label: "Financial history" },
  { id: 3, label: "Owner earnings" },
  { id: 4, label: "Revenue quality" },
  { id: 5, label: "Operations" },
  { id: 6, label: "Assets & evidence" },
  { id: 7, label: "Review & calculate" },
];

// ─────────────────────────────────────────────
// Shared UI helpers
// ─────────────────────────────────────────────

function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-semibold text-slate-300"
    >
      {children}
      {required && (
        <span className="ml-1 text-rose-400" aria-label="required">
          *
        </span>
      )}
    </label>
  );
}

function InputField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  min,
  max,
  suffix,
  hint,
  required,
  error,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  suffix?: string;
  hint?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div className="relative mt-2">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          aria-required={required}
          aria-describedby={hint ? `${id}-hint` : undefined}
          aria-invalid={!!error}
          className={`w-full rounded-lg border bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400 ${
            error ? "border-rose-500" : "border-slate-700"
          } ${suffix ? "pr-12" : ""}`}
        />
        {suffix && (
          <span className="absolute right-4 top-3 text-slate-500">{suffix}</span>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 h-5 w-9 shrink-0 rounded-full border-2 transition-colors ${
          checked
            ? "border-cyan-400 bg-cyan-400"
            : "border-slate-600 bg-slate-800"
        }`}
        type="button"
      >
        <span
          className={`block h-3 w-3 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <div>
        <label
          htmlFor={id}
          className="cursor-pointer text-sm font-medium text-slate-300"
        >
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Individual steps
// ─────────────────────────────────────────────

function StepBusinessProfile({
  data,
  setData,
  errors,
}: {
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <InputField
        id="businessName"
        label="Business name"
        value={data.businessName}
        onChange={(v) => setData((d) => ({ ...d, businessName: v }))}
        placeholder="Acme Services LLC"
        required
        error={errors["businessProfile.businessName"]}
      />

      <div>
        <Label htmlFor="industry" required>
          Industry
        </Label>
        <select
          id="industry"
          value={data.industry}
          onChange={(e) =>
            setData((d) => ({ ...d, industry: e.target.value as IndustryKey }))
          }
          aria-required
          className={`mt-2 w-full rounded-lg border bg-slate-950 px-4 py-3 text-slate-300 outline-none focus:border-cyan-400 ${
            errors["businessProfile.industry"] ? "border-rose-500" : "border-slate-700"
          }`}
        >
          <option value="" disabled>
            Select an industry
          </option>
          <option value="services">Professional services</option>
          <option value="home-services">Home services</option>
          <option value="food">Food and beverage</option>
          <option value="retail">Retail</option>
          <option value="construction">Construction</option>
          <option value="marketing">Marketing</option>
          <option value="technology">Technology</option>
          <option value="other">Other</option>
        </select>
        {errors["businessProfile.industry"] && (
          <p className="mt-1 text-xs text-rose-400">
            {errors["businessProfile.industry"]}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <InputField
          id="yearEstablished"
          label="Year established"
          type="number"
          value={data.yearEstablished}
          onChange={(v) => setData((d) => ({ ...d, yearEstablished: v }))}
          placeholder="2018"
          min="1800"
          max={String(currentYear)}
          required
          error={errors["businessProfile.yearEstablished"]}
        />

        <div>
          <Label htmlFor="currency">Currency</Label>
          <select
            id="currency"
            value={data.currency}
            onChange={(e) =>
              setData((d) => ({ ...d, currency: e.target.value }))
            }
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 outline-none focus:border-cyan-400"
          >
            <option value="USD">USD — US Dollar</option>
            <option value="CAD">CAD — Canadian Dollar</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="EUR">EUR — Euro</option>
            <option value="AUD">AUD — Australian Dollar</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function FinancialYearForm({
  yearIndex,
  yearData,
  onChange,
}: {
  yearIndex: number;
  yearData: FinancialYearData;
  onChange: (field: keyof FinancialYearData, value: string) => void;
}) {
  const prefix = `FY ${yearData.fiscalYear || "—"}`;

  return (
    <details
      open={yearIndex === 2}
      className="rounded-lg border border-slate-800 bg-slate-950/40"
    >
      <summary className="cursor-pointer rounded-lg px-4 py-3 text-sm font-semibold text-slate-300 hover:text-white list-none flex items-center justify-between">
        <span>{prefix}</span>
        <span className="text-slate-600 text-xs">click to expand</span>
      </summary>
      <div className="grid gap-4 px-4 pb-4 pt-2 sm:grid-cols-2">
        {[
          { field: "revenue" as const, label: "Revenue", hint: "Total revenue before any deductions" },
          { field: "cogs" as const, label: "Cost of goods sold (COGS)", hint: "Direct costs to deliver products/services" },
          { field: "operatingExpenses" as const, label: "Total operating expenses", hint: "Include owner salary in this figure" },
          { field: "ownerSalary" as const, label: "Owner salary (included above)", hint: "The portion of operating expenses paid to you" },
          { field: "ownerBenefits" as const, label: "Owner personal benefits", hint: "Personal expenses run through the business" },
          { field: "depreciation" as const, label: "Depreciation" },
          { field: "amortization" as const, label: "Amortization" },
          { field: "interest" as const, label: "Interest expense" },
          { field: "oneTimeExpenses" as const, label: "One-time / non-recurring expenses", hint: "Unusual costs that won't repeat" },
          { field: "oneTimeRevenue" as const, label: "One-time / non-recurring revenue", hint: "Revenue that won't repeat" },
        ].map(({ field, label, hint }) => (
          <InputField
            key={field}
            id={`fy-${yearIndex}-${field}`}
            label={label}
            type="number"
            value={yearData[field]}
            onChange={(v) => onChange(field, v)}
            placeholder="0"
            min="0"
            hint={hint}
          />
        ))}
      </div>
    </details>
  );
}

function StepFinancialHistory({
  data,
  setData,
}: {
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
}) {
  const updateYear = (
    index: number,
    field: keyof FinancialYearData,
    value: string
  ) => {
    setData((d) => {
      const updated = [...d.financialYears];
      updated[index] = { ...updated[index], [field]: value };
      return { ...d, financialYears: updated };
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Enter up to three years of financial data (oldest to most recent). At
        least one year is required. More years improve calculation quality.
      </p>
      {data.financialYears.map((yr, i) => (
        <FinancialYearForm
          key={i}
          yearIndex={i}
          yearData={yr}
          onChange={(field, value) => updateYear(i, field, value)}
        />
      ))}
    </div>
  );
}

function StepOwnerEarnings({
  data,
  setData,
}: {
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
}) {
  const addAddBack = () => {
    setData((d) => ({
      ...d,
      addBacks: [
        ...d.addBacks,
        { label: "", amount: "", direction: "add", explanation: "" },
      ],
    }));
  };

  const removeAddBack = (index: number) => {
    setData((d) => ({
      ...d,
      addBacks: d.addBacks.filter((_, i) => i !== index),
    }));
  };

  const updateAddBack = (
    index: number,
    field: keyof AddBack,
    value: string
  ) => {
    setData((d) => {
      const updated = [...d.addBacks];
      updated[index] = { ...updated[index], [field]: value };
      return { ...d, addBacks: updated };
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <InputField
          id="ownerWeeklyHours"
          label="Owner's weekly working hours"
          type="number"
          value={data.ownerWeeklyHours}
          onChange={(v) => setData((d) => ({ ...d, ownerWeeklyHours: v }))}
          placeholder="40"
          min="0"
          max="168"
          hint="This measures how dependent the business is on the current owner."
        />

        <InputField
          id="replacementManagerSalary"
          label="Replacement manager annual salary"
          type="number"
          value={data.replacementManagerSalary}
          onChange={(v) =>
            setData((d) => ({ ...d, replacementManagerSalary: v }))
          }
          placeholder="75000"
          min="0"
          hint="What would it cost to hire someone to do your role?"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="addBacks-section">Additional add-backs</Label>
          <button
            type="button"
            onClick={addAddBack}
            className="rounded-lg border border-cyan-400/30 px-3 py-1.5 text-xs font-semibold text-cyan-400 transition hover:border-cyan-400 hover:bg-cyan-400/10"
          >
            + Add item
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Add or deduct items that adjust reported earnings to reflect true
          owner benefit. Common add-backs include one-time expenses, personal
          vehicle use, and non-arm&apos;s-length rent.
        </p>

        {data.addBacks.length === 0 && (
          <p className="mt-3 text-xs text-slate-600">
            No add-backs added. Owner salary and standard items are already
            included from financial years.
          </p>
        )}

        <div className="mt-3 space-y-3" id="addBacks-section">
          {data.addBacks.map((ab, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  placeholder="Label (e.g. Personal vehicle)"
                  value={ab.label}
                  onChange={(e) => updateAddBack(i, "label", e.target.value)}
                  aria-label={`Add-back ${i + 1} label`}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />
                <div className="flex gap-2">
                  <input
                    placeholder="Amount"
                    type="number"
                    min="0"
                    value={ab.amount}
                    onChange={(e) => updateAddBack(i, "amount", e.target.value)}
                    aria-label={`Add-back ${i + 1} amount`}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                  />
                  <select
                    value={ab.direction}
                    onChange={(e) =>
                      updateAddBack(i, "direction", e.target.value)
                    }
                    aria-label={`Add-back ${i + 1} direction`}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-300 outline-none focus:border-cyan-400"
                  >
                    <option value="add">Add</option>
                    <option value="deduct">Deduct</option>
                  </select>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  placeholder="Brief explanation (optional)"
                  value={ab.explanation}
                  onChange={(e) =>
                    updateAddBack(i, "explanation", e.target.value)
                  }
                  aria-label={`Add-back ${i + 1} explanation`}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => removeAddBack(i)}
                  aria-label={`Remove add-back ${i + 1}`}
                  className="rounded-lg p-2 text-slate-600 transition hover:text-rose-400"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepRevenueQuality({
  data,
  setData,
  errors,
}: {
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <InputField
          id="recurringRevenuePct"
          label="Recurring revenue"
          type="number"
          value={data.recurringRevenuePct}
          onChange={(v) => setData((d) => ({ ...d, recurringRevenuePct: v }))}
          placeholder="0"
          min="0"
          max="100"
          suffix="%"
          hint="Revenue from subscriptions, retainers, or repeat customers"
          error={errors["revenueQuality.recurringRevenuePct"]}
        />

        <InputField
          id="contractedRevenuePct"
          label="Contracted revenue"
          type="number"
          value={data.contractedRevenuePct}
          onChange={(v) =>
            setData((d) => ({ ...d, contractedRevenuePct: v }))
          }
          placeholder="0"
          min="0"
          max="100"
          suffix="%"
          hint="Revenue under written contracts or service agreements"
          error={errors["revenueQuality.contractedRevenuePct"]}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <InputField
          id="largestCustomerPct"
          label="Revenue from largest customer"
          type="number"
          value={data.largestCustomerPct}
          onChange={(v) =>
            setData((d) => ({ ...d, largestCustomerPct: v }))
          }
          placeholder="0"
          min="0"
          max="100"
          suffix="%"
          hint="Buyers will scrutinize high concentration carefully"
          error={errors["revenueQuality.largestCustomerPct"]}
        />

        <InputField
          id="top5CustomersPct"
          label="Revenue from top 5 customers"
          type="number"
          value={data.top5CustomersPct}
          onChange={(v) => setData((d) => ({ ...d, top5CustomersPct: v }))}
          placeholder="0"
          min="0"
          max="100"
          suffix="%"
          error={errors["revenueQuality.top5CustomersPct"]}
        />
      </div>

      <InputField
        id="churnRatePct"
        label="Annual customer churn rate (optional)"
        type="number"
        value={data.churnRatePct}
        onChange={(v) => setData((d) => ({ ...d, churnRatePct: v }))}
        placeholder="Leave blank if unknown"
        min="0"
        max="100"
        suffix="%"
        hint="Leave blank if unknown. Churn rate = customers lost ÷ total customers"
        error={errors["revenueQuality.churnRatePct"]}
      />
    </div>
  );
}

function StepOperations({
  data,
  setData,
}: {
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <Toggle
          id="hasDocumentedProcedures"
          label="Documented operating procedures (SOPs)"
          checked={data.hasDocumentedProcedures}
          onChange={(v) =>
            setData((d) => ({ ...d, hasDocumentedProcedures: v }))
          }
          hint="Written playbooks, checklists, or process documentation for key business functions"
        />

        <Toggle
          id="hasKeyEmployees"
          label="Key employees who can run the business without me"
          checked={data.hasKeyEmployees}
          onChange={(v) => setData((d) => ({ ...d, hasKeyEmployees: v }))}
          hint="Employees with the skills and authority to manage operations independently"
        />

        {data.hasKeyEmployees && (
          <div className="ml-12">
            <InputField
              id="keyEmployeeCount"
              label="How many key employees?"
              type="number"
              value={data.keyEmployeeCount}
              onChange={(v) => setData((d) => ({ ...d, keyEmployeeCount: v }))}
              placeholder="1"
              min="0"
            />
          </div>
        )}

        <Toggle
          id="hasSystemsAndTechnology"
          label="Business systems and technology in place"
          checked={data.hasSystemsAndTechnology}
          onChange={(v) =>
            setData((d) => ({ ...d, hasSystemsAndTechnology: v }))
          }
          hint="CRM, inventory, scheduling, or other software that runs independently of the owner"
        />

        <Toggle
          id="hasProprietaryIP"
          label="Proprietary IP or unique competitive assets"
          checked={data.hasProprietaryIP}
          onChange={(v) => setData((d) => ({ ...d, hasProprietaryIP: v }))}
          hint="Trademarks, patents, proprietary software, exclusive supplier relationships, or brand assets"
        />
      </div>
    </div>
  );
}

function StepAssetsAndEvidence({
  data,
  setData,
  errors,
}: {
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <InputField
          id="fairValueOfTangibleAssets"
          label="Fair value of tangible assets"
          type="number"
          value={data.fairValueOfTangibleAssets}
          onChange={(v) =>
            setData((d) => ({ ...d, fairValueOfTangibleAssets: v }))
          }
          placeholder="0"
          min="0"
          hint="Equipment, inventory, fixtures, and other physical assets at current fair market value"
          error={errors["assetsAndEvidence.fairValueOfTangibleAssets"]}
        />

        <InputField
          id="totalLiabilities"
          label="Total business liabilities"
          type="number"
          value={data.totalLiabilities}
          onChange={(v) => setData((d) => ({ ...d, totalLiabilities: v }))}
          placeholder="0"
          min="0"
          hint="Loans, lines of credit, and other obligations to be assumed or settled at sale"
          error={errors["assetsAndEvidence.totalLiabilities"]}
        />
      </div>

      <div className="space-y-4">
        <p className="text-sm font-semibold text-slate-300">Available documentation</p>

        <Toggle
          id="hasTaxReturns"
          label="Business tax returns — last 3 years"
          checked={data.hasTaxReturns}
          onChange={(v) => setData((d) => ({ ...d, hasTaxReturns: v }))}
          hint="Required by most buyers and SBA lenders for due diligence"
        />

        <Toggle
          id="hasAuditedFinancials"
          label="Audited or reviewed financial statements"
          checked={data.hasAuditedFinancials}
          onChange={(v) => setData((d) => ({ ...d, hasAuditedFinancials: v }))}
          hint="Prepared and verified by an independent CPA"
        />

        <Toggle
          id="hasCustomerContracts"
          label="Written customer contracts"
          checked={data.hasCustomerContracts}
          onChange={(v) =>
            setData((d) => ({ ...d, hasCustomerContracts: v }))
          }
          hint="Service agreements or purchase contracts with customers"
        />

        <Toggle
          id="hasEmployeeAgreements"
          label="Employee agreements and non-competes"
          checked={data.hasEmployeeAgreements}
          onChange={(v) =>
            setData((d) => ({ ...d, hasEmployeeAgreements: v }))
          }
          hint="Employment agreements, non-disclosure, and non-compete agreements with key staff"
        />
      </div>
    </div>
  );
}

function StepReview({
  data,
  reportId,
}: {
  data: WizardData;
  reportId: string | null;
}) {
  const activeYears = data.financialYears.filter(
    (y) => y.fiscalYear && y.revenue
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Summary
        </p>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-400">Business</dt>
            <dd className="text-white font-medium">{data.businessName || "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Industry</dt>
            <dd className="text-white">{data.industry || "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Financial years</dt>
            <dd className="text-white">{activeYears.length} provided</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Add-backs</dt>
            <dd className="text-white">{data.addBacks.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Owner hours/week</dt>
            <dd className="text-white">{data.ownerWeeklyHours || "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Tax returns</dt>
            <dd className="text-white">{data.hasTaxReturns ? "✓ Yes" : "✗ No"}</dd>
          </div>
        </dl>
      </div>

      {reportId && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-400/5 p-3">
          <p className="text-xs text-cyan-400">
            Draft saved. Clicking &ldquo;Calculate report&rdquo; will finalize this report and you won&apos;t be able to modify these inputs.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
        <p className="text-xs font-semibold text-amber-300">Disclaimer</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          This report is a preliminary planning estimate for educational purposes only.
          It is not a certified appraisal, fairness opinion, investment recommendation, or guaranteed sale price.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Build FormData from wizard state
// ─────────────────────────────────────────────

function buildFormData(data: WizardData, reportId: string | null): FormData {
  const fd = new FormData();
  if (reportId) fd.append("reportId", reportId);
  fd.append("businessName", data.businessName);
  fd.append("industry", data.industry);
  fd.append("yearEstablished", data.yearEstablished);
  fd.append("currency", data.currency);
  fd.append("ownerWeeklyHours", data.ownerWeeklyHours);
  fd.append("replacementManagerSalary", data.replacementManagerSalary);
  fd.append("recurringRevenuePct", data.recurringRevenuePct || "0");
  fd.append("largestCustomerPct", data.largestCustomerPct || "0");
  fd.append("top5CustomersPct", data.top5CustomersPct || "0");
  fd.append("contractedRevenuePct", data.contractedRevenuePct || "0");
  fd.append("churnRatePct", data.churnRatePct);
  fd.append("hasDocumentedProcedures", String(data.hasDocumentedProcedures));
  fd.append("hasKeyEmployees", String(data.hasKeyEmployees));
  fd.append("keyEmployeeCount", data.keyEmployeeCount);
  fd.append("hasSystemsAndTechnology", String(data.hasSystemsAndTechnology));
  fd.append("hasProprietaryIP", String(data.hasProprietaryIP));
  fd.append("fairValueOfTangibleAssets", data.fairValueOfTangibleAssets || "0");
  fd.append("totalLiabilities", data.totalLiabilities || "0");
  fd.append("hasAuditedFinancials", String(data.hasAuditedFinancials));
  fd.append("hasTaxReturns", String(data.hasTaxReturns));
  fd.append("hasCustomerContracts", String(data.hasCustomerContracts));
  fd.append("hasEmployeeAgreements", String(data.hasEmployeeAgreements));

  // Financial years (only those with a year set)
  let fyIndex = 0;
  for (const yr of data.financialYears) {
    if (!yr.fiscalYear) continue;
    const prefix = `financialYears[${fyIndex}]`;
    fd.append(`${prefix}.fiscalYear`, yr.fiscalYear);
    fd.append(`${prefix}.revenue`, yr.revenue || "0");
    fd.append(`${prefix}.cogs`, yr.cogs || "0");
    fd.append(`${prefix}.operatingExpenses`, yr.operatingExpenses || "0");
    fd.append(`${prefix}.ownerSalary`, yr.ownerSalary || "0");
    fd.append(`${prefix}.ownerBenefits`, yr.ownerBenefits || "0");
    fd.append(`${prefix}.depreciation`, yr.depreciation || "0");
    fd.append(`${prefix}.amortization`, yr.amortization || "0");
    fd.append(`${prefix}.interest`, yr.interest || "0");
    fd.append(`${prefix}.oneTimeExpenses`, yr.oneTimeExpenses || "0");
    fd.append(`${prefix}.oneTimeRevenue`, yr.oneTimeRevenue || "0");
    fyIndex++;
  }

  // Add-backs
  data.addBacks.forEach((ab, i) => {
    const prefix = `addBacks[${i}]`;
    fd.append(`${prefix}.label`, ab.label);
    fd.append(`${prefix}.amount`, ab.amount || "0");
    fd.append(`${prefix}.direction`, ab.direction);
    fd.append(`${prefix}.explanation`, ab.explanation);
  });

  return fd;
}

// ─────────────────────────────────────────────
// Main wizard component
// ─────────────────────────────────────────────

export function ValuationWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(DEFAULT_DATA);
  const [reportId, setReportId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isLastStep = step === STEPS.length;

  function handleNext() {
    setErrors({});
    setActionError(null);
    setSaveSuccessMsg(null);
    if (!isLastStep) setStep((s) => s + 1);
  }

  function handleBack() {
    setErrors({});
    setActionError(null);
    setSaveSuccessMsg(null);
    if (step > 1) setStep((s) => s - 1);
  }

  function handleSaveDraft() {
    setErrors({});
    setActionError(null);
    setSaveSuccessMsg(null);
    const fd = buildFormData(data, reportId);

    startTransition(async () => {
      const result: ValuationActionResult = await saveDraft(fd);
      if (result.success) {
        setReportId(result.reportId);
        setSaveSuccessMsg("Draft saved.");
      } else {
        setActionError(result.message);
        if ("errors" in result && result.errors) setErrors(result.errors);
      }
    });
  }

  function handleCalculate() {
    setErrors({});
    setActionError(null);
    setSaveSuccessMsg(null);
    const fd = buildFormData(data, reportId);

    startTransition(async () => {
      const result: ValuationActionResult = await calculateReport(fd);
      if (!result.success) {
        setActionError(result.message);
        if ("errors" in result && result.errors) setErrors(result.errors);
      }
      // On success, the server action redirects to the report page
    });
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      {/* Progress indicator */}
      <nav aria-label="Wizard steps">
        <ol className="flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((s) => (
            <li key={s.id} className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (s.id < step) {
                    setErrors({});
                    setActionError(null);
                    setStep(s.id);
                  }
                }}
                aria-current={step === s.id ? "step" : undefined}
                disabled={s.id > step}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                  step === s.id
                    ? "bg-cyan-400 text-slate-950"
                    : s.id < step
                    ? "bg-cyan-400/20 text-cyan-400 hover:bg-cyan-400/30"
                    : "bg-slate-800 text-slate-600 cursor-not-allowed"
                }`}
                title={s.label}
              >
                {s.id < step ? "✓" : s.id}
              </button>
              {s.id < STEPS.length && (
                <div
                  className={`h-0.5 w-4 rounded-full ${
                    s.id < step ? "bg-cyan-400/40" : "bg-slate-800"
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-slate-500">
          Step {step} of {STEPS.length}: {STEPS[step - 1].label}
        </p>
      </nav>

      {/* Step title */}
      <div className="mt-5">
        <h2 className="text-xl font-bold text-white">
          {STEPS[step - 1].label}
        </h2>
      </div>

      {/* Error banner */}
      {actionError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400"
        >
          {actionError}
        </div>
      )}

      {/* Success banner */}
      {saveSuccessMsg && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400"
        >
          {saveSuccessMsg}
        </div>
      )}

      {/* Step content */}
      <div className="mt-6">
        {step === 1 && (
          <StepBusinessProfile data={data} setData={setData} errors={errors} />
        )}
        {step === 2 && (
          <StepFinancialHistory data={data} setData={setData} />
        )}
        {step === 3 && (
          <StepOwnerEarnings data={data} setData={setData} />
        )}
        {step === 4 && (
          <StepRevenueQuality data={data} setData={setData} errors={errors} />
        )}
        {step === 5 && (
          <StepOperations data={data} setData={setData} />
        )}
        {step === 6 && (
          <StepAssetsAndEvidence
            data={data}
            setData={setData}
            errors={errors}
          />
        )}
        {step === 7 && (
          <StepReview data={data} reportId={reportId} />
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={isPending}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white disabled:opacity-50"
            >
              ← Back
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isPending}
            className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-400 transition hover:border-cyan-400/40 hover:text-cyan-400 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save draft"}
          </button>
        </div>

        <div>
          {!isLastStep ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isPending}
              className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCalculate}
              disabled={isPending}
              className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {isPending ? "Calculating…" : "Calculate report"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
