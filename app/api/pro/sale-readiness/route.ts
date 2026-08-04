import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserBillingState, checkProFeature } from '@/lib/billing';
import { canWriteFinance } from '@/lib/business-access';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const billing = await getUserBillingState(supabase, user.id);
  const proCheck = checkProFeature(billing.entitlements, 'saleReadiness');
  if (proCheck) {
    return NextResponse.json({ error: proCheck.message }, { status: 403 });
  }

  let body: { businessId: string; input: unknown; result: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { businessId, input, result } = body;

  if (!businessId || typeof businessId !== 'string') {
    return NextResponse.json({ error: 'businessId is required.' }, { status: 400 });
  }

  const canWrite = await canWriteFinance(user.id, businessId);
  if (!canWrite) {
    return NextResponse.json({ error: 'Business not found.' }, { status: 404 });
  }

  const res = result as Record<string, unknown>;

  const { error: insertError } = await supabase
    .from('sale_readiness_assessments')
    .insert({
      user_id: user.id,
      business_id: businessId,
      overall_score: res.overallScore,
      stage: res.stage,
      input_snapshot: input,
      category_results: res.categories,
      strongest_category: res.strongestCategory,
      weakest_category: res.weakestCategory,
      delta_from_previous: res.deltaFromPrevious ?? null,
      scored_at: res.scoredAt,
    });

  if (insertError) {
    console.error('sale_readiness insert error:', insertError);
    return NextResponse.json({ error: 'Failed to save assessment.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
