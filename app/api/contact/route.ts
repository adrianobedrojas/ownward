// app/api/contact/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MAX_NAME    = 200;
const MAX_EMAIL   = 254;
const MAX_SUBJECT = 300;
const MAX_MESSAGE = 5000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  // Honeypot: a hidden field that real users never fill in
  if (raw.website || raw.phone_number) {
    // Silently return success to bots without storing anything
    return NextResponse.json({ success: true });
  }

  const name    = typeof raw.name    === 'string' ? raw.name.trim()    : '';
  const email   = typeof raw.email   === 'string' ? raw.email.trim()   : '';
  const subject = typeof raw.subject === 'string' ? raw.subject.trim() : '';
  const message = typeof raw.message === 'string' ? raw.message.trim() : '';

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 });
  }

  if (name.length > MAX_NAME) {
    return NextResponse.json({ error: `Name must be ${MAX_NAME} characters or fewer` }, { status: 400 });
  }
  if (email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
  }
  if (subject.length > MAX_SUBJECT) {
    return NextResponse.json({ error: `Subject must be ${MAX_SUBJECT} characters or fewer` }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: `Message must be ${MAX_MESSAGE} characters or fewer` }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('contact_messages')
      .insert([{
        name:    name.slice(0, MAX_NAME),
        email:   email.toLowerCase().slice(0, MAX_EMAIL),
        subject: subject.slice(0, MAX_SUBJECT) || null,
        message: message.slice(0, MAX_MESSAGE),
        user_id: user?.id ?? null,
      }]);

    if (error) {
      console.error('Contact form DB error:', error.message);
      return NextResponse.json({ error: 'We could not submit your message. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Contact form unexpected error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
