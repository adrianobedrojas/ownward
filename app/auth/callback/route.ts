import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_AUTH_REDIRECT_PATH, getSafeNextPath } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const safeNext = getSafeNextPath(searchParams.get("next"), DEFAULT_AUTH_REDIRECT_PATH);

  if (!code) {
    return NextResponse.redirect(new URL("/error", origin));
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("Ownward Hub OAuth exchange error:", exchangeError.message);
    return NextResponse.redirect(new URL("/error", origin));
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Ownward Hub OAuth user fetch error:", userError?.message ?? "No user");
    return NextResponse.redirect(new URL("/error", origin));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Ownward Hub OAuth profile fetch error:", profileError.message);
    return NextResponse.redirect(new URL("/error", origin));
  }

  if (!profile?.onboarding_complete) {
    return NextResponse.redirect(new URL("/onboarding", origin));
  }

  return NextResponse.redirect(new URL(safeNext, origin));
}
