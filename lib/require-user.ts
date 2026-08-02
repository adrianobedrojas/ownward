import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPolicyAcceptanceRequirements } from "@/lib/policies";

/**
 * Loads the current authenticated user.
 *
 * Private server pages can call this instead of repeating
 * the Supabase authentication check.
 */
export async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete, terms_accepted_at, terms_version")
    .eq("id", user.id)
    .maybeSingle();

  const { needsTermsAcceptance } = getPolicyAcceptanceRequirements(profile);

  if (profile?.onboarding_complete && needsTermsAcceptance) {
    redirect("/onboarding?policy=terms-update");
  }

  return {
    supabase,
    user,
  };
}
