'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  computeSaleReadiness,
  buildActionPlan,
  estimateTimelineMonths,
} from '@/lib/sale-readiness/engine';
import type {
  SaleReadinessInput,
  SaleReadinessResult,
} from '@/lib/sale-readiness/engine';

interface Business {
  id: string;
  name: string;
  profile_completion: number;
}

interface Assessment {
  id: string;
  business_id: string;
  overall_score: number;
  stage: string;
  scored_at: string;
}

interface Props {
  businesses: Business[];
  recentAssessments: Assessment[];
  userId: string;
}

const EMPTY_INPUT: SaleReadinessInput = {
  hasThreeYearFinancials: false,
  hasCleanBooks: false,
  revenueGrowthPositive: null,
  ebitdaMarginPct: null,

  hasAuditedFinancials: false,
  hasRecentTaxReturns: false,
  hasMonthlyPnl: false,
  hasBankStatements: false,

  topCustomerRevenuePct: null,
  top5CustomerRevenuePct: null,
  customerCount: null,

  recurringRevenuePct: null,
  hasActiveContracts: false,
  avgContractLengthMonths: null,

  ownerHoursPerWeek: null,
  hasDocumentedProcesses: false,
  hasSecondInCommand: false,

  hasOperationsManual: false,
  hasVendorContracts: false,
  hasKeySystemsDocumented: false,

  hasFormationDocs: false,
  hasCleanCapTable: false,
  hasActiveIpProtection: null,
  hasNoMajorLitigation: false,

  hasKeyEmployeeContracts: false,
  avgEmployeeTenureYears: null,
  hasSuccessionPlan: false,

  hasTechDocumentation: false,
  hasAutomatedProcesses: false,
  hasCyberSecurityMeasures: false,

  hasValuationReport: false,
  hasListingOrTeaserDoc: false,
  hasNdaTemplate: false,
  hasIdentifiedBuyerProfiles: false,
};

const SCORE_COLOR = (score: number) => {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 50) return 'text-cyan-400';
  if (score >= 25) return 'text-amber-400';
  return 'text-rose-400';
};

const RISK_COLOR: Record<string, string> = {
  none: 'text-emerald-400',
  low: 'text-cyan-400',
  medium: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-rose-500',
};

function validateNumericInputs(
  input: SaleReadinessInput
): string | null {
  if (
    input.ebitdaMarginPct !== null &&
    (
      input.ebitdaMarginPct < -100 ||
      input.ebitdaMarginPct > 100
    )
  ) {
    return 'EBITDA / profit margin must be between -100% and 100%.';
  }

  if (
    input.topCustomerRevenuePct !== null &&
    (
      input.topCustomerRevenuePct < 0 ||
      input.topCustomerRevenuePct > 100
    )
  ) {
    return 'Top customer revenue must be between 0% and 100%.';
  }

  if (
    input.top5CustomerRevenuePct !== null &&
    (
      input.top5CustomerRevenuePct < 0 ||
      input.top5CustomerRevenuePct > 100
    )
  ) {
    return 'Top 5 customers revenue must be between 0% and 100%.';
  }

  if (
    input.customerCount !== null &&
    (
      input.customerCount < 0 ||
      !Number.isInteger(input.customerCount)
    )
  ) {
    return 'Total active customers must be a whole number of 0 or more.';
  }

  if (
    input.recurringRevenuePct !== null &&
    (
      input.recurringRevenuePct < 0 ||
      input.recurringRevenuePct > 100
    )
  ) {
    return 'Recurring revenue must be between 0% and 100%.';
  }

  if (
    input.avgContractLengthMonths !== null &&
    input.avgContractLengthMonths < 0
  ) {
    return 'Average contract length cannot be negative.';
  }

  if (
    input.ownerHoursPerWeek !== null &&
    (
      input.ownerHoursPerWeek < 0 ||
      input.ownerHoursPerWeek > 168
    )
  ) {
    return 'Owner hours per week must be between 0 and 168.';
  }

  if (
    input.avgEmployeeTenureYears !== null &&
    input.avgEmployeeTenureYears < 0
  ) {
    return 'Average employee tenure cannot be negative.';
  }

  if (
    input.topCustomerRevenuePct !== null &&
    input.top5CustomerRevenuePct !== null &&
    input.topCustomerRevenuePct > input.top5CustomerRevenuePct
  ) {
    return 'Top customer revenue cannot be greater than Top 5 customers revenue.';
  }

  return null;
}

export default function SaleReadinessClient({
  businesses,
  recentAssessments,
}: Props) {
  const [selectedBusinessId, setSelectedBusinessId] =
    useState<string>(businesses[0]?.id ?? '');

  const [input, setInput] =
    useState<SaleReadinessInput>({ ...EMPTY_INPUT });

  const [result, setResult] =
    useState<SaleReadinessResult | null>(null);

  const [saving, setSaving] = useState(false);

  const [saveMessage, setSaveMessage] =
    useState<string | null>(null);

  const [validationError, setValidationError] =
    useState<string | null>(null);
  
  if (businesses.length === 0) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cyan-300">
          Sale-Readiness Assessment
        </h1>

        <p className="mt-2 text-slate-400 text-sm max-w-2xl">
          Evaluate your business across 10 categories and get a transparent
          0–100 readiness score.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8">
        <h2 className="text-xl font-semibold text-slate-100">
          Create a business profile first
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Sale Readiness measures a specific business. Add your business to
          Ownward before starting this assessment so your score, recommendations,
          and future progress can be saved to the correct business.
        </p>

        <Link
          href="/business/new"
          className="mt-6 inline-flex items-center rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          Create Business
        </Link>
      </div>
    </div>
  );
}

  const latestAssessmentForBusiness = recentAssessments.find(
    (assessment) =>
      assessment.business_id === selectedBusinessId
  );

  const handleCompute = () => {
    const error = validateNumericInputs(input);

    if (error) {
      setValidationError(error);
      setSaveMessage(null);
      setResult(null);
      return;
    }

    setValidationError(null);
    setSaveMessage(null);

    const previousScore =
      latestAssessmentForBusiness?.overall_score ?? null;

    const computedResult = computeSaleReadiness(
      input,
      previousScore
    );

    setResult(computedResult);
  };

  const handleSave = async () => {
    if (!result || !selectedBusinessId) {
      return;
    }

    const error = validateNumericInputs(input);

    if (error) {
      setValidationError(error);
      setSaveMessage(null);
      return;
    }

    setValidationError(null);
    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch(
        '/api/pro/sale-readiness',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessId: selectedBusinessId,
            input,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        if (data.result) {
          setResult(
            data.result as SaleReadinessResult
          );
        }

        setSaveMessage(
          'Assessment saved successfully.'
        );
      } else {
        setSaveMessage(
          data.error ??
            'Failed to save assessment.'
        );
      }
    } catch {
      setSaveMessage(
        'An unexpected error occurred.'
      );
    } finally {
      setSaving(false);
    }
  };

  const setBool = (
    key: keyof SaleReadinessInput,
    value: boolean
  ) => {
    setInput((previous) => ({
      ...previous,
      [key]: value,
    }));

    setResult(null);
    setSaveMessage(null);
    setValidationError(null);
  };
  
  const setIpProtection = (
    value: SaleReadinessInput['hasActiveIpProtection']
  ) => {
    setInput((previous) => ({
      ...previous,
      hasActiveIpProtection: value,
    }));

    setResult(null);
    setSaveMessage(null);
    setValidationError(null);
  };

  const setNumber = (
    key: keyof SaleReadinessInput,
    raw: string
  ) => {
    const numberValue =
      raw === '' ? null : parseFloat(raw);

    setInput((previous) => ({
      ...previous,
      [key]:
        numberValue === null ||
        Number.isNaN(numberValue)
          ? null
          : numberValue,
    }));

  setResult(null);
  setSaveMessage(null);
  setValidationError(null);
};

  const actionPlan = result
    ? buildActionPlan(result)
    : [];

  const timeline = result
    ? estimateTimelineMonths(result.overallScore)
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cyan-300">
          Sale-Readiness Assessment
        </h1>

        <p className="mt-2 text-slate-400 text-sm max-w-2xl">
          Evaluate your business across 10 categories
          and get a transparent 0–100 readiness score.
          This tool is for planning purposes only — it
          is not a professional appraisal, audit, or
          legal opinion.
        </p>
      </div>

      {/* Business selector */}
      {businesses.length > 1 && (
        <div className="mb-6">
          <label className="block text-xs text-slate-400 mb-1">
            Select Business
          </label>

          <select
            value={selectedBusinessId}
            onChange={(event) =>
              setSelectedBusinessId(
                event.target.value
              )
            }
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
          >
            {businesses.map((business) => (
              <option
                key={business.id}
                value={business.id}
              >
                {business.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {latestAssessmentForBusiness && (
        <div className="mb-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-200">
          Last assessment:{' '}
          <strong>
            {
              latestAssessmentForBusiness.overall_score
            }
            /100
          </strong>{' '}
          on{' '}
          {new Date(
            latestAssessmentForBusiness.scored_at
          ).toLocaleDateString()}
        </div>
      )}

      {/* Input form */}
      <div className="space-y-8">
        {/* Financial Quality */}
        <Section title="Financial Quality">
          <BoolField
            label="3+ years of financial history"
            value={input.hasThreeYearFinancials}
            onChange={(value) =>
              setBool(
                'hasThreeYearFinancials',
                value
              )
            }
          />

          <BoolField
            label="Clean, organized bookkeeping"
            value={input.hasCleanBooks}
            onChange={(value) =>
              setBool('hasCleanBooks', value)
            }
          />

          <BoolField
            label="Positive revenue growth trend"
            value={!!input.revenueGrowthPositive}
            onChange={(value) =>
              setBool(
                'revenueGrowthPositive',
                value
              )
            }
          />

          <NumberField
            label="EBITDA / profit margin %"
            helperText="Enter your EBITDA margin if you know it, or the operating/profit margin you currently track. Example: $15,000 of profit on $100,000 of revenue = 15%. A negative percentage is allowed if the business is operating at a loss."
            value={input.ebitdaMarginPct}
            onChange={(value) =>
              setNumber(
                'ebitdaMarginPct',
                value
              )
             }
            min={-100}
            max={100}
            step={0.1}
          />
        </Section>

        {/* Financial Documentation */}
        <Section title="Financial Documentation">
          <BoolField
            label="Last 2 years of tax returns"
            value={input.hasRecentTaxReturns}
            onChange={(value) =>
              setBool(
                'hasRecentTaxReturns',
                value
              )
            }
          />

          <BoolField
            label="Monthly P&L statements"
            value={input.hasMonthlyPnl}
            onChange={(value) =>
              setBool(
                'hasMonthlyPnl',
                value
              )
            }
          />

          <BoolField
            label="Bank statements"
            value={input.hasBankStatements}
            onChange={(value) =>
              setBool(
                'hasBankStatements',
                value
              )
            }
          />

          <BoolField
            label="Audited financials (optional bonus)"
            value={input.hasAuditedFinancials}
            onChange={(value) =>
              setBool(
                'hasAuditedFinancials',
                value
              )
            }
          />
        </Section>

        {/* Customer Diversification */}
        <Section title="Customer Diversification">
          <NumberField
            label="Top customer revenue %"
            helperText="Percentage of your total annual revenue that comes from your single largest customer. Example: if your largest customer generates $20,000 of $100,000 in annual revenue, enter 20%."
            value={input.topCustomerRevenuePct}
            onChange={(value) =>
             setNumber(
               'topCustomerRevenuePct',
                value
              )
            }
            min={0}
            max={100}
            step={0.1}
          />

          <NumberField
            label="Top 5 customers revenue %"
            helperText="Add together the annual revenue from your five largest customers, then divide it by your total annual revenue. Example: if your top five customers generate $60,000 of $100,000 total revenue, enter 60%."
            value={input.top5CustomerRevenuePct}
            onChange={(value) =>
              setNumber(
                'top5CustomerRevenuePct',
                value
              )
            }
            min={0}
            max={100}
            step={0.1}
          />

          <NumberField
            label="Total active customers"
            helperText="Enter the number of customers currently buying from, subscribed to, or actively under contract with the business. Use a whole number."
            value={input.customerCount}
            onChange={(value) =>
              setNumber(
              'customerCount',
                value
              )
            }
            min={0}
            step={1}
          />
        </Section>

        {/* Recurring Revenue */}
        <Section title="Recurring & Contracted Revenue">
          <NumberField
            label="Recurring revenue %"
            helperText="Percentage of revenue you expect to repeat automatically or contractually, such as subscriptions, retainers, memberships, maintenance agreements, or recurring service contracts."
            value={input.recurringRevenuePct}
            onChange={(value) =>
              setNumber(
                'recurringRevenuePct',
                value
              )
            }
            min={0}
            max={100}
            step={0.1}
          />

          <BoolField
            label="Active customer contracts"
            value={input.hasActiveContracts}
            onChange={(value) =>
              setBool(
                'hasActiveContracts',
                value
              )
            }
          />

          <NumberField
            label="Avg contract length (months)"
            helperText="Enter the typical length of your active customer contracts in months. Example: annual contracts usually equal 12 months. Enter 0 if customers are not committed to a fixed contract term."
            value={input.avgContractLengthMonths}
            onChange={(value) =>
              setNumber(
                'avgContractLengthMonths',
                value
              )
            }
            min={0}
            step={0.1}
          />
        </Section>

        {/* Owner Independence */}
        <Section title="Owner Independence">
          <NumberField
            label="Owner hours per week in business"
            helperText="Approximately how many hours per week the owner personally needs to work for the business to continue operating normally. Include management, sales, customer work, approvals, and other essential owner responsibilities."
            value={input.ownerHoursPerWeek}
            onChange={(value) =>
              setNumber(
                'ownerHoursPerWeek',
                value
              )
            }
            min={0}
            max={168}
            step={0.5}
          />

          <BoolField
            label="Documented operating procedures"
            value={input.hasDocumentedProcesses}
            onChange={(value) =>
              setBool(
                'hasDocumentedProcesses',
                value
              )
            }
          />

          <BoolField
            label="Second-in-command or management layer"
            value={input.hasSecondInCommand}
            onChange={(value) =>
              setBool(
                'hasSecondInCommand',
                value
              )
            }
          />
        </Section>

        {/* Operational Transferability */}
        <Section title="Operational Transferability">
          <BoolField
            label="Operations manual or runbook"
            value={input.hasOperationsManual}
            onChange={(value) =>
              setBool(
                'hasOperationsManual',
                value
              )
            }
          />

          <BoolField
            label="Vendor/supplier contracts"
            value={input.hasVendorContracts}
            onChange={(value) =>
              setBool(
                'hasVendorContracts',
                value
              )
            }
          />

          <BoolField
            label="Key systems documented"
            value={
              input.hasKeySystemsDocumented
            }
            onChange={(value) =>
              setBool(
                'hasKeySystemsDocumented',
                value
              )
            }
          />
        </Section>

        {/* Legal & Org Records */}
        <Section title="Legal & Org Records">
          <BoolField
            label="Formation documents"
            value={input.hasFormationDocs}
            onChange={(value) =>
              setBool(
                'hasFormationDocs',
                value
              )
            }
          />

          <BoolField
            label="Clean cap table / ownership records"
            value={input.hasCleanCapTable}
            onChange={(value) =>
              setBool(
                'hasCleanCapTable',
                value
              )
            }
          />

          <BoolField
            label="No major litigation or disputes"
            value={input.hasNoMajorLitigation}
            onChange={(value) =>
              setBool(
                'hasNoMajorLitigation',
                value
              )
            }
          />

          <IpProtectionField
            value={input.hasActiveIpProtection}
            onChange={setIpProtection}
          />
        </Section>

        {/* Team Continuity */}
        <Section title="Team Continuity">
          <BoolField
            label="Key employee agreements in place"
            value={
              input.hasKeyEmployeeContracts
            }
            onChange={(value) =>
              setBool(
                'hasKeyEmployeeContracts',
                value
              )
            }
          />

          <NumberField
            label="Avg employee tenure (years)"
            helperText="Approximately how long your current employees have worked for the business on average. Example: if most employees have been with the business for about 3 years, enter 3."
            value={input.avgEmployeeTenureYears}
            onChange={(value) =>
              setNumber(
                'avgEmployeeTenureYears',
                value
              )
            }
            min={0}
            step={0.1}
          />

          <BoolField
            label="Succession / continuity plan"
            value={input.hasSuccessionPlan}
            onChange={(value) =>
              setBool(
                'hasSuccessionPlan',
                value
              )
            }
          />
        </Section>

        {/* Technology & Process */}
        <Section title="Technology & Process Maturity">
          <BoolField
            label="Technology stack documented"
            value={
              input.hasTechDocumentation
            }
            onChange={(value) =>
              setBool(
                'hasTechDocumentation',
                value
              )
            }
          />

          <BoolField
            label="Automated or repeatable processes"
            value={
              input.hasAutomatedProcesses
            }
            onChange={(value) =>
              setBool(
                'hasAutomatedProcesses',
                value
              )
            }
          />

          <BoolField
            label="Basic cybersecurity measures"
            value={
              input.hasCyberSecurityMeasures
            }
            onChange={(value) =>
              setBool(
                'hasCyberSecurityMeasures',
                value
              )
            }
          />
        </Section>

        {/* Buyer Preparation */}
        <Section title="Buyer Preparation">
          <BoolField
            label="Business valuation report"
            value={input.hasValuationReport}
            onChange={(value) =>
              setBool(
                'hasValuationReport',
                value
              )
            }
          />

          <BoolField
            label="Listing or teaser document"
            value={
              input.hasListingOrTeaserDoc
            }
            onChange={(value) =>
              setBool(
                'hasListingOrTeaserDoc',
                value
              )
            }
          />

          <BoolField
            label="NDA template ready"
            value={input.hasNdaTemplate}
            onChange={(value) =>
              setBool(
                'hasNdaTemplate',
                value
              )
            }
          />

          <BoolField
            label="Identified target buyer profiles"
            value={
              input.hasIdentifiedBuyerProfiles
            }
            onChange={(value) =>
              setBool(
                'hasIdentifiedBuyerProfiles',
                value
              )
            }
          />
        </Section>
      </div>

      {/* Compute score */}
      <div className="mt-8">
        <button
          onClick={handleCompute}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-6 py-3 rounded-xl text-sm"
        >
          Compute Score
        </button>

        {validationError && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
          >
            {validationError}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="mt-12 space-y-8">
          {/* Overall score */}
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div
                  className={`text-5xl font-bold ${SCORE_COLOR(
                    result.overallScore
                  )}`}
                >
                  {result.overallScore}
                  <span className="text-xl text-slate-400">
                    /100
                  </span>
                </div>

                <div className="mt-1 text-sm text-slate-300">
                  {result.stageLabel}
                </div>

                {result.deltaFromPrevious !==
                  null && (
                  <div
                    className={`mt-1 text-sm ${
                      result.deltaFromPrevious >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {result.deltaFromPrevious >= 0
                      ? '+'
                      : ''}
                    {result.deltaFromPrevious}{' '}
                    from previous
                  </div>
                )}
              </div>

              {timeline && (
                <div className="text-right">
                  <div className="text-xs text-slate-400 mb-1">
                    Estimated time to market
                  </div>

                  <div className="text-lg font-semibold text-slate-200">
                    {timeline.minMonths}–
                    {timeline.maxMonths} months
                  </div>

                  <div className="text-xs text-slate-400 max-w-48">
                    {timeline.description}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="text-slate-400">
                Strongest:{' '}
                <span className="text-emerald-300">
                  {
                    result.categories.find(
                      (category) =>
                        category.category ===
                        result.strongestCategory
                    )?.label
                  }
                </span>
              </div>

              <div className="text-slate-400">
                Weakest:{' '}
                <span className="text-rose-300">
                  {
                    result.categories.find(
                      (category) =>
                        category.category ===
                        result.weakestCategory
                    )?.label
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-slate-200">
              Category Breakdown
            </h2>

            <div className="space-y-3">
              {result.categories.map(
                (category) => (
                  <div
                    key={category.category}
                    className="rounded-xl border border-slate-700 bg-slate-900/80 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm text-slate-200">
                        {category.label}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">
                          Confidence:{' '}
                          {category.confidence}%
                        </span>

                        <span
                          className={`text-sm font-bold ${SCORE_COLOR(
                            category.score
                          )}`}
                        >
                          {category.score}/100
                        </span>

                        <span
                          className={`text-xs font-medium ${
                            RISK_COLOR[
                              category.riskLevel
                            ]
                          }`}
                        >
                          {category.riskLevel.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="mt-2 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          category.score >= 75
                            ? 'bg-emerald-400'
                            : category.score >= 50
                              ? 'bg-cyan-400'
                              : category.score >= 25
                                ? 'bg-amber-400'
                                : 'bg-rose-500'
                        }`}
                        style={{
                          width: `${category.score}%`,
                        }}
                      />
                    </div>

                    {category.missingEvidence
                      .length > 0 && (
                      <div className="mt-2 text-xs text-slate-400">
                        Missing:{' '}
                        {category.missingEvidence.join(
                          ' · '
                        )}
                      </div>
                    )}

                    <div className="mt-1 text-xs text-slate-500">
                      {
                        category.recommendedAction
                      }
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* 30/60/90 action plan */}
          {actionPlan.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-slate-200">
                30/60/90-Day Action Plan
              </h2>

              <div className="space-y-2">
                {actionPlan.map(
                  (item, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 flex items-start gap-4"
                    >
                      <div
                        className={`text-xs font-bold rounded-full px-2 py-1 shrink-0 ${
                          item.priority ===
                          'critical'
                            ? 'bg-rose-500/20 text-rose-400'
                            : item.priority ===
                                'high'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-cyan-500/20 text-cyan-400'
                        }`}
                      >
                        {item.horizon}-day
                      </div>

                      <div>
                        <div className="text-sm text-slate-200">
                          {item.action}
                        </div>

                        <div className="text-xs text-slate-500 mt-0.5">
                          {item.category.replace(
                            /_/g,
                            ' '
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-xs text-slate-500">
            <strong className="text-slate-400">
              Disclaimer:
            </strong>{' '}
            {result.disclaimer}
          </div>

          {/* Save button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={
                saving ||
                !selectedBusinessId
              }
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-3 rounded-xl text-sm disabled:opacity-50"
            >
              {saving
                ? 'Saving…'
                : 'Save Assessment'}
            </button>

            {saveMessage && (
              <span className="text-sm text-slate-300">
                {saveMessage}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6">
      <h2 className="text-base font-semibold text-slate-200 mb-4">
        {title}
      </h2>

      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function BoolField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-300">
      <input
        type="checkbox"
        checked={value}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="w-4 h-4 accent-cyan-400"
      />

      {label}
    </label>
  );
}

function IpProtectionField({
  value,
  onChange,
}: {
  value: SaleReadinessInput['hasActiveIpProtection'];
  onChange: (
    value: SaleReadinessInput['hasActiveIpProtection']
  ) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
      <div className="text-sm text-slate-300">
        Active trademark, patent, or other IP protection
      </div>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        Select Yes if the business has active patents, registered trademarks,
        or other formal intellectual-property protection. Select Not applicable
        if this type of protection is not material to the business or its value.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-lg border px-4 py-2 text-sm transition ${
            value === true
              ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
              : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
          }`}
        >
          Yes
        </button>

        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-lg border px-4 py-2 text-sm transition ${
            value === false
              ? 'border-rose-400 bg-rose-400/10 text-rose-300'
              : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
          }`}
        >
          No
        </button>

        <button
          type="button"
          onClick={() => onChange('not_applicable')}
          className={`rounded-lg border px-4 py-2 text-sm transition ${
            value === 'not_applicable'
              ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
              : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
          }`}
        >
          Not applicable
        </button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  helperText,
  value,
  onChange,
  min,
  max,
  step = 'any',
}: {
  label: string;
  helperText?: string;
  value: number | null;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number | 'any';
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1">
        <label className="text-sm text-slate-300">
          {label}
        </label>

        {helperText && (
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            {helperText}
          </p>
        )}
      </div>

      <input
        type="number"
        value={value ?? ''}
        onChange={(event) =>
          onChange(event.target.value)
        }
        min={min}
        max={max}
        step={step}
        placeholder="—"
        className="w-full sm:w-28 shrink-0 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-right text-slate-100"
      />
    </div>
  );
}
