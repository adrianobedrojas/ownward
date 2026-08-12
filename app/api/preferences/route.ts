import { createClient } from "@/lib/supabase/server";

const MARKETING_CONSENT_VERSION = "2026-08-10.1";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const marketingOptIn = Boolean(body?.marketingOptIn);
  const thirdPartyMarketingOptIn = Boolean(body?.thirdPartyMarketingOptIn);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({
      marketing_opt_in: marketingOptIn,
      marketing_opt_in_at: marketingOptIn ? now : null,
      marketing_opt_in_source: "preferences_page",
      third_party_marketing_opt_in: thirdPartyMarketingOptIn,
      third_party_marketing_opt_in_at: thirdPartyMarketingOptIn ? now : null,
      third_party_marketing_opt_in_source: "preferences_page",
      marketing_consent_version: MARKETING_CONSENT_VERSION,
      updated_at: now,
    })
    .eq("id", authData.user.id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}