import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");

  if (!code) {
    redirect("/auth-error?code=invalid-link");
  }

  const supabase = await createClient();

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error(
      "Google OAuth exchange error:",
      exchangeError.message
    );

    redirect("/auth-error?code=exchange-failed");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth-error?code=exchange-failed");
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) {
    console.error(
      "Google OAuth profile lookup error:",
      profileError.message
    );

    redirect("/error");
  }

  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
