import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PRIVACY_POLICY_PATH, TERMS_POLICY_PATH } from "@/lib/auth";
import { getPolicyAcceptanceRequirements } from "@/lib/policies";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "./actions";

export default async function OnboardingPage() {
  const locale = await getLocale();
  const isSpanish = locale === "es";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "full_name, account_type, business_name, current_stage, terms_accepted_at, privacy_accepted_at, terms_version, privacy_version, partner_marketing_consent"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    redirect("/error");
  }

  const prefilledFullName =
    profile?.full_name ??
    String(user.user_metadata?.full_name ?? "").trim();
  const prefilledAccountType =
    profile?.account_type ??
    String(user.user_metadata?.account_type ?? "").trim();
  const prefilledBusinessName =
    profile?.business_name ??
    String(user.user_metadata?.business_name ?? "").trim();
  const currentStage = profile?.current_stage ?? "run";

  const prefilledPartnerMarketingConsent =
    typeof profile?.partner_marketing_consent === "boolean"
      ? profile.partner_marketing_consent
      : Boolean(user.user_metadata?.partner_marketing_consent);

  const { needsTermsAcceptance, needsPrivacyAcknowledgment } = getPolicyAcceptanceRequirements(profile);

  const copy = isSpanish
    ? {
        welcome: "Bienvenido a Ownward",
        title: "Completa tu onboarding",
        description: "Cuéntanos en qué etapa estás para personalizar tu espacio de trabajo.",
        fullName: "Nombre completo",
        accountType: "Tipo de cuenta",
        selectAccountType: "Selecciona un tipo de cuenta",
        owner: "Dueño de negocio",
        buyer: "Comprador de negocio",
        ownerBuyer: "Dueño y comprador",
        advisor: "Asesor o agencia",
        businessName: "Nombre del negocio",
        optional: "Opcional",
        currentStage: "Etapa actual",
        stageStart: "Iniciando",
        stageRun: "Operando",
        stageSell: "Preparando venta",
        stageBuy: "Buscando comprar",
        termsAgree: "Acepto los",
        privacyAck: "Reconozco la",
        partnerConsentTitle: "Comunicaciones y oportunidades de socios (opcional)",
        partnerConsentBody:
          "Sí, quiero recibir oportunidades comerciales relevantes. Ownward y socios seleccionados pueden contactarme por correo electrónico, teléfono o SMS. Puedo retirar mi consentimiento en cualquier momento.",
        partnerTermsLink: "Ver Términos de Comunicaciones de Socios",
        partnerCompDisclosure:
          "Ownward puede recibir compensación, como una tarifa de referencia o comisión, de ciertas ofertas de socios.",
        continue: "Continuar al panel",
      }
    : {
        welcome: "Welcome to Ownward",
        title: "Finish onboarding",
        description: "Tell us where you are in your journey so we can personalize your workspace.",
        fullName: "Full name",
        accountType: "Account type",
        selectAccountType: "Select an account type",
        owner: "Business owner",
        buyer: "Business buyer",
        ownerBuyer: "Owner and buyer",
        advisor: "Advisor or agency",
        businessName: "Business name",
        optional: "Optional",
        currentStage: "Current stage",
        stageStart: "Starting",
        stageRun: "Running",
        stageSell: "Preparing to sell",
        stageBuy: "Looking to buy",
        termsAgree: "I agree to the",
        privacyAck: "I acknowledge the",
        partnerConsentTitle: "Partner communications & opportunities (optional)",
        partnerConsentBody:
          "Yes, I’d like relevant business opportunities. Ownward and selected partners may contact me by email, phone, or SMS. I can withdraw my consent at any time.",
        partnerTermsLink: "View Partner Communications Terms",
        partnerCompDisclosure:
          "Ownward may receive compensation, such as a referral fee or commission, from certain partner offers.",
        continue: "Continue to dashboard",
      };

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          {copy.welcome}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">{copy.title}</h1>
        <p className="mt-3 text-slate-300">
          {copy.description}
        </p>

        <form action={completeOnboarding} className="mt-8 space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-slate-300">
              {copy.fullName}
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              defaultValue={prefilledFullName}
              required
              autoComplete="name"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600"
            />
          </div>

          <div>
            <label htmlFor="accountType" className="block text-sm font-semibold text-slate-300">
              {copy.accountType}
            </label>
            <select
              id="accountType"
              name="accountType"
              defaultValue={prefilledAccountType || ""}
              required
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300"
            >
              <option value="" disabled>
                {copy.selectAccountType}
              </option>
              <option value="owner">{copy.owner}</option>
              <option value="buyer">{copy.buyer}</option>
              <option value="owner-buyer">{copy.ownerBuyer}</option>
              <option value="advisor">{copy.advisor}</option>
            </select>
          </div>

          <div>
            <label htmlFor="businessName" className="block text-sm font-semibold text-slate-300">
              {copy.businessName}
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              defaultValue={prefilledBusinessName}
              placeholder={copy.optional}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600"
            />
          </div>

          <div>
            <label htmlFor="currentStage" className="block text-sm font-semibold text-slate-300">
              {copy.currentStage}
            </label>
            <select
              id="currentStage"
              name="currentStage"
              defaultValue={currentStage}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300"
            >
              <option value="start">{copy.stageStart}</option>
              <option value="run">{copy.stageRun}</option>
              <option value="sell">{copy.stageSell}</option>
              <option value="buy">{copy.stageBuy}</option>
            </select>
          </div>

          {(needsTermsAcceptance || needsPrivacyAcknowledgment) && (
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
              {needsTermsAcceptance ? (
                <label className="flex items-start gap-3 text-sm text-slate-300">
                  <input
                    name="acceptTerms"
                    type="checkbox"
                    required
                    className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 accent-cyan-400"
                  />
                  <span>
                    {copy.termsAgree}{" "}
                    <Link href={TERMS_POLICY_PATH} className="font-semibold text-cyan-300 hover:text-cyan-200">
                      {isSpanish ? "Términos del servicio" : "Terms of Service"}
                    </Link>
                    .
                  </span>
                </label>
              ) : null}

              {needsPrivacyAcknowledgment ? (
                <label className="flex items-start gap-3 text-sm text-slate-300">
                  <input
                    name="acceptPrivacy"
                    type="checkbox"
                    required
                    className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 accent-cyan-400"
                  />
                  <span>
                    {copy.privacyAck}{" "}
                    <Link href={PRIVACY_POLICY_PATH} className="font-semibold text-cyan-300 hover:text-cyan-200">
                      {isSpanish ? "Política de privacidad" : "Privacy Policy"}
                    </Link>
                    .
                  </span>
                </label>
              ) : null}
            </div>
          )}

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              {copy.partnerConsentTitle}
            </p>

            <label className="mt-3 flex items-start gap-3 text-sm text-slate-300">
              <input
                name="partnerMarketingConsent"
                type="checkbox"
                defaultChecked={prefilledPartnerMarketingConsent}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 accent-cyan-400"
              />
              <span>
                {copy.partnerConsentBody}{" "}
                <Link href="/partner-communications" className="font-semibold text-cyan-300 hover:text-cyan-200">
                  {copy.partnerTermsLink}
                </Link>
                .
              </span>
            </label>

            <p className="mt-2 text-xs text-slate-500">{copy.partnerCompDisclosure}</p>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            {copy.continue}
          </button>
        </form>
      </div>
    </section>
  );
}