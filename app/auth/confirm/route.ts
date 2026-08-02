import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getSafeNextPath } from "@/lib/auth";

const VALID_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "email",
  "recovery",
  "invite",
  "magiclink",
  "email_change",
  "phone_change",
]);

const RECOVERY_TYPES = new Set<EmailOtpType>(["recovery"]);

function mapVerifyError(error: { code?: string; message: string }): string {
  const code = error.code ?? "";
  if (
    code === "otp_expired" ||
    error.message.toLowerCase().includes("expired") ||
    error.message.toLowerCase().includes("already been used")
  ) {
    return "otp_expired";
  }
  return "invalid-token";
}

async function handleTokenHash(
  tokenHash: string,
  type: EmailOtpType,
  next: string | null
) {
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    redirect(`/auth-error?code=${mapVerifyError(error)}`);
  }

  const defaultPath = RECOVERY_TYPES.has(type) ? "/reset-password" : "/onboarding";
  redirect(getSafeNextPath(next, defaultPath));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  // PKCE code exchange (Supabase SSR flow)
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      redirect("/auth-error?code=exchange-failed");
    }

    redirect(getSafeNextPath(next, "/onboarding"));
  }

  // Legacy token_hash + type OTP verification
  if (tokenHash && type && VALID_OTP_TYPES.has(type)) {
    await handleTokenHash(tokenHash, type, next);
  }

  redirect("/auth-error?code=invalid-link");
}

// POST is used by the scanner-resistant /confirm-email landing page so that
// email security scanners (which issue GET requests) do not consume the token.
export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const tokenHash = formData.get("token_hash") as string | null;
  const type = formData.get("type") as EmailOtpType | null;
  const next = formData.get("next") as string | null;

  if (tokenHash && type && VALID_OTP_TYPES.has(type)) {
    await handleTokenHash(tokenHash, type, next);
  }

  redirect("/auth-error?code=invalid-link");
}