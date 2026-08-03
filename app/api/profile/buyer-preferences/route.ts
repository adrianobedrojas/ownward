import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_PRIMARY_GOALS = [
  'owner_operator',
  'passive_investment',
  'strategic_add_on',
  'researching',
  '',
  null,
];

const ALLOWED_INVOLVEMENT = [
  'full_time',
  'part_time',
  'board_only',
  'passive',
  '',
  null,
];

const ALLOWED_TIMELINES = [
  '0_3_months',
  '3_6_months',
  '6_12_months',
  '1_2_years',
  '2_plus_years',
  '',
  null,
];

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const data = body as Record<string, unknown>;

    // Validate enum fields
    if ('primary_goal' in data && !ALLOWED_PRIMARY_GOALS.includes(data.primary_goal as string)) {
      return NextResponse.json({ error: 'Invalid primary_goal' }, { status: 400 });
    }
    if ('desired_involvement' in data && !ALLOWED_INVOLVEMENT.includes(data.desired_involvement as string)) {
      return NextResponse.json({ error: 'Invalid desired_involvement' }, { status: 400 });
    }
    if ('purchase_timeline' in data && !ALLOWED_TIMELINES.includes(data.purchase_timeline as string)) {
      return NextResponse.json({ error: 'Invalid purchase_timeline' }, { status: 400 });
    }

    // Validate numeric budget fields
    const budgetMin = data.budget_min != null ? Number(data.budget_min) : null;
    const budgetMax = data.budget_max != null ? Number(data.budget_max) : null;
    if (budgetMin !== null && (isNaN(budgetMin) || budgetMin < 0)) {
      return NextResponse.json({ error: 'Invalid budget_min' }, { status: 400 });
    }
    if (budgetMax !== null && (isNaN(budgetMax) || budgetMax < 0)) {
      return NextResponse.json({ error: 'Invalid budget_max' }, { status: 400 });
    }
    if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
      return NextResponse.json({ error: 'budget_min cannot exceed budget_max' }, { status: 400 });
    }

    // Validate array field
    const preferredLocations = Array.isArray(data.preferred_locations)
      ? (data.preferred_locations as unknown[])
          .filter((l): l is string => typeof l === 'string')
          .map((l) => l.slice(0, 200))
          .slice(0, 50)
      : [];

    const payload = {
      buyer_id: user.id,
      primary_goal: (data.primary_goal as string) || null,
      budget_min: budgetMin,
      budget_max: budgetMax,
      preferred_locations: preferredLocations,
      remote_business_ok: data.remote_business_ok === true,
      desired_involvement: (data.desired_involvement as string) || null,
      purchase_timeline: (data.purchase_timeline as string) || null,
      share_with_sellers: data.share_with_sellers === true,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('buyer_purchase_profiles')
      .upsert(payload, { onConflict: 'buyer_id' });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
