"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

type Factor = {
  id: string;
  factor_type: string;
  status: string;
  friendly_name?: string | null;
};

export default function AdminMfaClient({ nextPath }: { nextPath: string }) {
  const t = useTranslations("AdminSecurity");
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [enrollFactorId, setEnrollFactorId] = useState<string>("");
  const [qrSvg, setQrSvg] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState<string>("");
  const [loginCode, setLoginCode] = useState<string>("");
  const [factors, setFactors] = useState<Factor[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selectedFactorId, setSelectedFactorId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refreshFactors() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const allFactors = [
      ...((data?.totp ?? []) as Factor[]),
      ...((data?.phone ?? []) as Factor[]),
      ...((data?.webauthn ?? []) as Factor[]),
    ];

    const verified = allFactors.filter((f) => f.status === "verified");
    setFactors(verified);
    if (!selectedFactorId && verified.length > 0) {
      setSelectedFactorId(verified[0].id);
    }
  }

  async function startEnrollment() {
    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });

    setIsSubmitting(false);

    if (error || !data) {
      setErrorMessage(error?.message ?? t("mfaStartError"));
      return;
    }

    setEnrollFactorId(data.id);
    setQrSvg(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStatusMessage(t("mfaStarted"));
  }

  async function verifyEnrollment() {
    if (!enrollFactorId || !verifyCode.trim()) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollFactorId,
      code: verifyCode.trim(),
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStatusMessage(t("mfaVerified"));
    await refreshFactors();
    router.push(nextPath);
    router.refresh();
  }

  async function verifyChallenge() {
    if (!selectedFactorId || !loginCode.trim()) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: selectedFactorId,
      code: loginCode.trim(),
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStatusMessage(t("challengeSuccess"));
    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-semibold text-white">{t("challengeTitle")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("challengeDescription")}</p>

        <button
          type="button"
          onClick={refreshFactors}
          className="mt-3 rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
        >
          {t("refreshFactors")}
        </button>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr,auto]">
          <select
            value={selectedFactorId}
            onChange={(event) => setSelectedFactorId(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="">{t("selectFactor")}</option>
            {factors.map((factor) => (
              <option key={factor.id} value={factor.id}>
                {factor.friendly_name ?? factor.factor_type} · {factor.id.slice(0, 8)}
              </option>
            ))}
          </select>

          <input
            value={loginCode}
            onChange={(event) => setLoginCode(event.target.value)}
            inputMode="numeric"
            placeholder={t("codePlaceholder")}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          />
        </div>

        <button
          type="button"
          onClick={verifyChallenge}
          disabled={isSubmitting}
          className="mt-3 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
        >
          {t("verifyChallenge")}
        </button>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-lg font-semibold text-white">{t("enrollTitle")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("enrollDescription")}</p>

        <button
          type="button"
          onClick={startEnrollment}
          disabled={isSubmitting}
          className="mt-3 rounded-lg border border-cyan-500/50 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-60"
        >
          {t("startEnrollment")}
        </button>

        {qrSvg ? (
          <div className="mt-4 space-y-3 rounded-lg border border-slate-700 bg-slate-950 p-4">
            <p className="text-xs text-slate-400">{t("scanQr")}</p>
            <div className="inline-block rounded-md bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <p className="break-all text-xs text-slate-400">{t("secretLabel")}: {secret}</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={verifyCode}
                onChange={(event) => setVerifyCode(event.target.value)}
                inputMode="numeric"
                placeholder={t("codePlaceholder")}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={verifyEnrollment}
                disabled={isSubmitting}
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
              >
                {t("verifyEnrollment")}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {statusMessage ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {statusMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
