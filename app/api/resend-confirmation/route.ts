import { createClient } from "@/lib/supabase/server";
import { getOnboardingConfirmRedirectUrl } from "@/lib/auth";
import { getSiteUrl } from "@/lib/config";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let email: string;

  try {
    const body = await request.json();
    email = String(body.email ?? "")
      .trim()
      .toLowerCase();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad-request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!email || !EMAIL_RE.test(email)) {
    return new Response(
      JSON.stringify({ ok: false, error: "invalid-email" }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = await createClient();
  const siteUrl = getSiteUrl();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: getOnboardingConfirmRedirectUrl(siteUrl),
    },
  });

  // Surface rate-limit responses so the client can show a friendly cooldown.
  if (
    error &&
    (error.status === 429 || error.message.toLowerCase().includes("rate"))
  ) {
    return new Response(JSON.stringify({ ok: false, error: "rate-limited" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Always return a generic success response to avoid disclosing whether an
  // account exists for the given email address.
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
