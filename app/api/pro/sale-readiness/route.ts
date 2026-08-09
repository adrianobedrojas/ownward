import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canWriteFinance } from '@/lib/business-access';
import { computeSaleReadiness } from '@/lib/sale-readiness/engine';
import type { SaleReadinessInput } from '@/lib/sale-readiness/engine';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableNumberInRange(
  value: unknown,
  min: number,
  max: number
): boolean {
  return (
    value === null ||
    (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max
    )
  );
}

function isNullableNonNegativeNumber(value: unknown): boolean {
  return (
    value === null ||
    (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0
    )
  );
}

function isSaleReadinessInput(value: unknown): value is SaleReadinessInput {
  if (!isRecord(value)) {
    return false;
  }

  const booleanFields: (keyof SaleReadinessInput)[] = [
    'hasThreeYearFinancials',
    'hasCleanBooks',
    'hasAuditedFinancials',
    'hasRecentTaxReturns',
    'hasMonthlyPnl',
    'hasBankStatements',
    'hasActiveContracts',
    'hasDocumentedProcesses',
    'hasSecondInCommand',
    'hasOperationsManual',
    'hasVendorContracts',
    'hasKeySystemsDocumented',
    'hasFormationDocs',
    'hasCleanCapTable',
    'hasNoMajorLitigation',
    'hasKeyEmployeeContracts',
    'hasSuccessionPlan',
    'hasTechDocumentation',
    'hasAutomatedProcesses',
    'hasCyberSecurityMeasures',
    'hasValuationReport',
    'hasListingOrTeaserDoc',
    'hasNdaTemplate',
    'hasIdentifiedBuyerProfiles',
  ];

  const nullableBooleanFields: (keyof SaleReadinessInput)[] = [
    'revenueGrowthPositive',
  ];

  const nullableNumberFields: (keyof SaleReadinessInput)[] = [
    'ebitdaMarginPct',
    'topCustomerRevenuePct',
    'top5CustomerRevenuePct',
    'customerCount',
    'recurringRevenuePct',
    'avgContractLengthMonths',
    'ownerHoursPerWeek',
    'avgEmployeeTenureYears',
  ];

  for (const field of booleanFields) {
    if (typeof value[field] !== 'boolean') {
      return false;
    }
  }

  for (const field of nullableBooleanFields) {
    const fieldValue = value[field];

    if (fieldValue !== null && typeof fieldValue !== 'boolean') {
      return false;
    }
  }

  const ipProtectionValue = value.hasActiveIpProtection;

  if (
    ipProtectionValue !== null &&
    typeof ipProtectionValue !== 'boolean' &&
    ipProtectionValue !== 'not_applicable'
  ) {
    return false;
  }
  
  for (const field of nullableNumberFields) {
    const fieldValue = value[field];

    if (
      fieldValue !== null &&
      (
        typeof fieldValue !== 'number' ||
        !Number.isFinite(fieldValue)
      )
    ) {
      return false;
    }
  }

  if (!isNullableNumberInRange(value.ebitdaMarginPct, -100, 100)) {
    return false;
  }

  if (!isNullableNumberInRange(value.topCustomerRevenuePct, 0, 100)) {
    return false;
  }

  if (!isNullableNumberInRange(value.top5CustomerRevenuePct, 0, 100)) {
    return false;
  }

  if (!isNullableNumberInRange(value.recurringRevenuePct, 0, 100)) {
    return false;
  }

  if (!isNullableNumberInRange(value.ownerHoursPerWeek, 0, 168)) {
    return false;
  }

  if (!isNullableNonNegativeNumber(value.avgContractLengthMonths)) {
    return false;
  }

  if (!isNullableNonNegativeNumber(value.avgEmployeeTenureYears)) {
    return false;
  }

  if (
    value.customerCount !== null &&
    (
      typeof value.customerCount !== 'number' ||
      !Number.isFinite(value.customerCount) ||
      value.customerCount < 0 ||
      !Number.isInteger(value.customerCount)
    )
  ) {
    return false;
  }

  if (
    typeof value.topCustomerRevenuePct === 'number' &&
    typeof value.top5CustomerRevenuePct === 'number' &&
    value.topCustomerRevenuePct > value.top5CustomerRevenuePct
  ) {
    return false;
  }

  return true;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const { businessId, input } = body;

  if (!businessId || typeof businessId !== 'string') {
    return NextResponse.json(
      { error: 'businessId is required.' },
      { status: 400 }
    );
  }

  if (!isSaleReadinessInput(input)) {
    return NextResponse.json(
      { error: 'Invalid sale-readiness input.' },
      { status: 400 }
    );
  }

  const canWrite = await canWriteFinance(user.id, businessId);

  if (!canWrite) {
    return NextResponse.json(
      { error: 'Business not found.' },
      { status: 404 }
    );
  }

  const {
    data: previousAssessment,
    error: previousAssessmentError,
  } = await supabase
    .from('sale_readiness_assessments')
    .select('overall_score')
    .eq('user_id', user.id)
    .eq('business_id', businessId)
    .is('deleted_at', null)
    .order('scored_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousAssessmentError) {
    console.error(
      'sale_readiness previous assessment error:',
      previousAssessmentError
    );

    return NextResponse.json(
      { error: 'Failed to load previous assessment.' },
      { status: 500 }
    );
  }

  const previousScore = previousAssessment?.overall_score ?? null;

  const result = computeSaleReadiness(input, previousScore);

  const { error: insertError } = await supabase
    .from('sale_readiness_assessments')
    .insert({
      user_id: user.id,
      business_id: businessId,
      overall_score: result.overallScore,
      stage: result.stage,
      input_snapshot: input,
      category_results: result.categories,
      strongest_category: result.strongestCategory,
      weakest_category: result.weakestCategory,
      delta_from_previous: result.deltaFromPrevious,
      scored_at: result.scoredAt,
    });

  if (insertError) {
    console.error(
      'sale_readiness insert error:',
      insertError
    );

    return NextResponse.json(
      { error: 'Failed to save assessment.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    result,
  });
}
