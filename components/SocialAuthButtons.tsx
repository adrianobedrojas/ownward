"use client";

import { useMemo, useState } from "react";
import { getSafeNextPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

interface SocialAuthButtonsProps {
  next?: string | null;
}

type OAuthProvider = "google" | "azure" | "apple";

const providers: Array<{ label: string; provider: OAuthProvider }> = [
  { label: "Google", provider: "google" },
  { label: "Microsoft", provider: "azure" },
  { label: "Apple", provider: "apple" },
];

export function SocialAuthButtons({ next }: SocialAuthButtonsProps) {
  const [isLoadingProvider, setIsLoadingProvider] = useState<OAuthProvider | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState("");
  const supabase = useMemo(() => createClient(), []);
  const safeNext = getSafeNextPath(next);

  async function handleSocialSignIn(provider: OAuthProvider) {
    setErrorMessage("");
    setIsLoadingProvider(provider);

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", safeNext);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
        ...(provider === "azure" ? { scopes: "email" } : {}),
      },
    });

    if (error) {
      setErrorMessage("Could not start social sign in. Please try again.");
      setIsLoadingProvider(null);
    }
  }

  return (
    <div className="space-y-3">
      {providers.map(({ label, provider }) => (
        <button
          key={provider}
          type="button"
          onClick={() => handleSocialSignIn(provider)}
          disabled={isLoadingProvider !== null}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoadingProvider === provider
            ? `Redirecting to ${label}...`
            : `Continue with ${label}`}
        </button>
      ))}

      {errorMessage && (
        <p className="text-sm text-rose-300" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
