import { createClient } from "@/lib/supabase/server";

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

  const accountType = String(formData.get("accountType") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessName = String(
    formData.get("businessName") ?? ""
  ).trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(
    formData.get("confirmPassword") ?? ""
  );
  const agreementAccepted =
    formData.get("agreement") === "on";

  if (
    !accountType ||
    !fullName ||
    !email ||
    !password ||
    !confirmPassword ||
    !agreementAccepted
  ) {
    return redirectTo("/error");
  }

  if (
    password !== confirmPassword ||
    password.length < 8
  ) {
    return redirectTo("/error");
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/onboarding`,
      data: {
        account_type: accountType,
        full_name: fullName,
        business_name: businessName || null,
      },
    },
  });

  if (error) {
    console.error(
      "Ownward Hub signup error:",
      error.message
    );

    return redirectTo("/error");
  }

  return redirectTo("/check-email");
}
