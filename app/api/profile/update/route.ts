import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_VISIBILITY = ['private', 'public', 'contacts_only'];
const ALLOWED_ROLES = ['buyer', 'seller', 'both', ''];
const ALLOWED_LOCALES = ['en', 'es'];

function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === 'string';
}

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

    // Validate and sanitize fields
    const update: Record<string, string | null> = {};

    if ('full_name' in data) {
      if (!isStringOrNull(data.full_name)) return NextResponse.json({ error: 'Invalid full_name' }, { status: 400 });
      update.full_name = data.full_name ? data.full_name.slice(0, 200) : null;
    }
    if ('headline' in data) {
      if (!isStringOrNull(data.headline)) return NextResponse.json({ error: 'Invalid headline' }, { status: 400 });
      update.headline = data.headline ? data.headline.slice(0, 200) : null;
    }
    if ('bio' in data) {
      if (!isStringOrNull(data.bio)) return NextResponse.json({ error: 'Invalid bio' }, { status: 400 });
      update.bio = data.bio ? data.bio.slice(0, 2000) : null;
    }
    if ('location' in data) {
      if (!isStringOrNull(data.location)) return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
      update.location = data.location ? data.location.slice(0, 200) : null;
    }
    if ('timezone' in data) {
      if (typeof data.timezone !== 'string') return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
      update.timezone = data.timezone.slice(0, 100);
    }
    if ('preferred_locale' in data) {
      if (typeof data.preferred_locale !== 'string' || !ALLOWED_LOCALES.includes(data.preferred_locale)) {
        return NextResponse.json({ error: 'Invalid preferred_locale' }, { status: 400 });
      }
      update.preferred_locale = data.preferred_locale;
    }
    if ('profile_visibility' in data) {
      if (typeof data.profile_visibility !== 'string' || !ALLOWED_VISIBILITY.includes(data.profile_visibility)) {
        return NextResponse.json({ error: 'Invalid profile_visibility' }, { status: 400 });
      }
      update.profile_visibility = data.profile_visibility;
    }
    if ('role' in data) {
      if (typeof data.role !== 'string' || !ALLOWED_ROLES.includes(data.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      update.role = data.role || null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
