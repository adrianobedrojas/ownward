"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

type FormState = "idle" | "loading" | "success" | "rate-limited" | "error";

const COOLDOWN_SECONDS = 60;

export function ResendConfirmationForm() {
  const t = useTranslations("Authentication.checkEmail.resend");
  const [state, setState] = useState<FormState>("idle");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCooldown() {
    setCountdown(COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setState("idle");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "loading" || countdown > 0) return;

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    if (!email) return;

    setState("loading");

    try {
      const response = await fetch("/api/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.status === 429) {
        setState("rate-limited");
        startCooldown();
        return;
      }

      // Always show generic success regardless of whether account exists
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
        <p className="font-semibold text-emerald-300">{t("successTitle")}</p>
        <p className="mt-2 text-sm text-emerald-400/80">{t("successMessage")}</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="font-semibold text-white">{t("title")}</h2>
      <p className="mt-1 text-sm text-slate-400">{t("description")}</p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {state === "error" && (
          <p className="text-sm text-red-400">{t("genericError")}</p>
        )}
        {state === "rate-limited" && countdown > 0 && (
          <p className="text-sm text-amber-400">
            {t("cooldownMessage", { seconds: countdown })}
          </p>
        )}
        <div>
          <label htmlFor="resend-email" className="block text-sm font-semibold text-slate-300">
            {t("emailLabel")}
          </label>
          <input
            id="resend-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
          />
        </div>
        <button
          type="submit"
          disabled={state === "loading" || countdown > 0}
          className="w-full rounded-lg bg-slate-700 px-5 py-3 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === "loading" ? t("submitting") : t("submit")}
        </button>
      </form>
    </div>
  );
}
