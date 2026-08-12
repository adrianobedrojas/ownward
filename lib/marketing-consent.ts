import { createClient } from "@/lib/supabase/server";

export async function getMarketingConsent(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("marketing_opt_in, third_party_marketing_opt_in")
    .eq("id", userId)
    .single();

  if (error) throw error;

  return {
    marketingOptIn: Boolean(data?.marketing_opt_in),
    thirdPartyMarketingOptIn: Boolean(data?.third_party_marketing_opt_in),
  };
}