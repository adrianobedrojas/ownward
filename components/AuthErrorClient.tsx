"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Only these Supabase-originated error codes are mapped; all others fall back
// to "generic" so that arbitrary Supabase error_description text is never
// rendered to the user.
const ALLOWED_CODES = new Set([
  "otp_expired",
  "access_denied",
  "exchange-failed",
  "invalid-link",
  "invalid-token",
]);

interface AuthErrorClientProps {
  /** Error code supplied via query parameter by our own route handler. */
  queryCode?: string;
}

/** Resolve the error code from the URL fragment or query param (client-only). */
function resolveErrorCode(queryCode: string | undefined): string {
  if (typeof window !== "undefined") {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const params = new URLSearchParams(hash);
      const fragmentCode = params.get("error_code") ?? params.get("error");
      if (fragmentCode && ALLOWED_CODES.has(fragmentCode)) {
        return fragmentCode;
      }
    }
  }
  return queryCode && ALLOWED_CODES.has(queryCode) ? queryCode : "generic";
}

export function AuthErrorClient({ queryCode }: AuthErrorClientProps) {
  const t = useTranslations("Authentication.authError");

  // Lazy initializer runs only on the client so that we can safely read the
  // URL fragment (which is unavailable during SSR) without triggering a
  // setState call inside a useEffect.
  const [errorCode] = useState(() => resolveErrorCode(queryCode));

  useEffect(() => {
    // Side-effect only: remove the fragment from the address bar so tokens are
    // not exposed in browser history or referrer headers.
    if (window.location.hash) {
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }
  }, []);

  const messageKey = ALLOWED_CODES.has(errorCode) ? errorCode : "generic";
  const isExpiredOrDenied =
    messageKey === "otp_expired" || messageKey === "access_denied";

  return (
    <section className="w-full max-w-lg rounded-2xl border border-red-900/50 bg-slate-900 p-8 text-center shadow-2xl shadow-slate-950">
      <p className="text-sm font-semibold uppercase tracking-wider text-red-400">
        {t("badge")}
      </p>

      <h1 className="mt-3 text-3xl font-bold text-white">
        {t(`errors.${messageKey}.heading`)}
      </h1>

      <p className="mt-4 leading-7 text-slate-400">
        {t(`errors.${messageKey}.description`)}
      </p>

      {isExpiredOrDenied && (
        <Link
          href="/check-email"
          className="mt-8 inline-block rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          {t("resendConfirmation")}
        </Link>
      )}

      <Link
        href="/signup"
        className="mt-5 block text-sm font-semibold text-cyan-300 hover:text-cyan-200"
      >
        {t("returnToSignup")}
      </Link>

      <Link
        href="/login"
        className="mt-3 block text-sm font-semibold text-slate-400 hover:text-white"
      >
        {t("returnToLogin")}
      </Link>
    </section>
  );
}
