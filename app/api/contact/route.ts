// app/api/contact/route.ts
import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_NAME    = 200;
const MAX_EMAIL   = 254;
const MAX_SUBJECT = 300;
const MAX_MESSAGE = 5000;
<<<<<<< HEAD
const CONTACT_WINDOW_MINUTES = 60;
const CONTACT_MAX_PER_IP = 8;
const CONTACT_MAX_PER_EMAIL = 5;
const CONTACT_SUSPICIOUS_THRESHOLD = 3;
const CONTACT_DUPLICATE_WINDOW_MINUTES = 30;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
=======
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
>>>>>>> origin/main

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return req.headers.get('x-real-ip')?.trim() ?? 'unknown';
}

function safeHash(value: string): string {
  const salt = process.env.RATE_LIMIT_HASH_SALT ?? 'ownward-default-salt';
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

async function logSecurityEvent(params: {
  channel: 'contact';
  eventType: 'rate_limited' | 'duplicate_submission' | 'turnstile_required';
  emailHash?: string;
  ipHash?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    await admin.from('request_security_events').insert({
      channel: params.channel,
      event_type: params.eventType,
      email_hash: params.emailHash ?? null,
      ip_hash: params.ipHash ?? null,
      user_id: params.userId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    // Avoid failing the primary request if logging fails.
  }
}

async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return true;
  }

  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', token);
  form.set('remoteip', ip);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}

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
  const turnstileToken =
    typeof raw.turnstileToken === 'string' ? raw.turnstileToken.trim() : '';

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
<<<<<<< HEAD
    const admin = createAdminClient();
=======
    const normalizedEmail = email.toLowerCase().slice(0, MAX_EMAIL);
    const rateLimitWindowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

    const { count: recentMessageCount, error: rateLimitError } = await supabase
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('email', normalizedEmail)
      .gte('created_at', rateLimitWindowStart);

    if (rateLimitError) {
      console.warn('Contact form rate-limit check failed:', rateLimitError.message);
    } else if ((recentMessageCount ?? 0) >= RATE_LIMIT_MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a few minutes and try again.' },
        { status: 429 },
      );
    }

>>>>>>> origin/main
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ip = getClientIp(req);
    const normalizedEmail = email.toLowerCase().slice(0, MAX_EMAIL);
    const ipHash = safeHash(ip);
    const emailHash = safeHash(normalizedEmail);
    const now = Date.now();
    const windowStart = new Date(now - CONTACT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const duplicateWindowStart = new Date(
      now - CONTACT_DUPLICATE_WINDOW_MINUTES * 60 * 1000
    ).toISOString();

    const [{ count: ipCount }, { count: emailCount }] = await Promise.all([
      admin
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('submission_ip_hash', ipHash)
        .gte('created_at', windowStart),
      admin
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('email', normalizedEmail)
        .gte('created_at', windowStart),
    ]);

    const requiresTurnstile =
      (ipCount ?? 0) >= CONTACT_SUSPICIOUS_THRESHOLD ||
      (emailCount ?? 0) >= CONTACT_SUSPICIOUS_THRESHOLD;

    if (requiresTurnstile) {
      const verified = turnstileToken
        ? await verifyTurnstileToken(turnstileToken, ip)
        : false;
      if (!verified) {
        await logSecurityEvent({
          channel: 'contact',
          eventType: 'turnstile_required',
          emailHash,
          ipHash,
          userId: user?.id,
          metadata: { reason: 'suspicious_activity_threshold' },
        });
        return NextResponse.json(
          {
            error: 'Additional verification is required before sending another message.',
            requiresVerification: true,
          },
          { status: 429 }
        );
      }
    }

    if ((ipCount ?? 0) >= CONTACT_MAX_PER_IP || (emailCount ?? 0) >= CONTACT_MAX_PER_EMAIL) {
      await logSecurityEvent({
        channel: 'contact',
        eventType: 'rate_limited',
        emailHash,
        ipHash,
        userId: user?.id,
        metadata: {
          ipCount: ipCount ?? 0,
          emailCount: emailCount ?? 0,
          windowMinutes: CONTACT_WINDOW_MINUTES,
        },
      });

      return NextResponse.json(
        { error: 'Too many contact submissions. Please try again later.' },
        { status: 429 }
      );
    }

    const { count: duplicateCount } = await admin
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('email', normalizedEmail)
      .eq('message', message.slice(0, MAX_MESSAGE))
      .gte('created_at', duplicateWindowStart);

    if ((duplicateCount ?? 0) > 0) {
      await logSecurityEvent({
        channel: 'contact',
        eventType: 'duplicate_submission',
        emailHash,
        ipHash,
        userId: user?.id,
        metadata: { duplicateWindowMinutes: CONTACT_DUPLICATE_WINDOW_MINUTES },
      });
      return NextResponse.json(
        { error: 'A similar message was submitted recently. Please wait before retrying.' },
        { status: 409 }
      );
    }

    const { error } = await admin
      .from('contact_messages')
      .insert([{
        name:    name.slice(0, MAX_NAME),
        email:   normalizedEmail,
        subject: subject.slice(0, MAX_SUBJECT) || null,
        message: message.slice(0, MAX_MESSAGE),
        user_id: user?.id ?? null,
        signed_in: Boolean(user?.id),
        submission_ip_hash: ipHash,
        user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
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
