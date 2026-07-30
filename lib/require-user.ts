import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  return {
    supabase,
    user,
  };
}
