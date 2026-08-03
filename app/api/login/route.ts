import { createClient } from "@/lib/supabase/server";
import { getSafeRedirect } from "@/lib/auth/safe-redirect";

function redirectTo(path: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: path,
    },
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    return redirectTo("/error");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Ownward Hub login error:", error.message);
    return redirectTo("/error");
  }

  return redirectTo(getSafeRedirect(next));
}
