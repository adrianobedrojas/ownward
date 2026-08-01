import { redirect } from "next/navigation";
import Link from "next/link";
import { PRIVACY_POLICY_PATH, TERMS_POLICY_PATH } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "./actions";

export default async function OnboardingPage() {
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
      "full_name, account_type, business_name, current_stage, terms_accepted_at, privacy_accepted_at"
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
  const needsPolicyConsent =
    !profile?.terms_accepted_at || !profile?.privacy_accepted_at;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          Welcome to Ownward
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">Finish onboarding</h1>
        <p className="mt-3 text-slate-300">
          Tell us where you are in your journey so we can personalize your workspace.
        </p>

        <form action={completeOnboarding} className="mt-8 space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-slate-300">
              Full name
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
              Account type
            </label>
            <select
              id="accountType"
              name="accountType"
              defaultValue={prefilledAccountType || ""}
              required
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300"
            >
              <option value="" disabled>
                Select an account type
              </option>
              <option value="owner">Business owner</option>
              <option value="buyer">Business buyer</option>
              <option value="owner-buyer">Owner and buyer</option>
              <option value="advisor">Advisor or agency</option>
            </select>
          </div>

          <div>
            <label htmlFor="businessName" className="block text-sm font-semibold text-slate-300">
              Business name
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              defaultValue={prefilledBusinessName}
              placeholder="Optional"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600"
            />
          </div>

          <div>
            <label htmlFor="currentStage" className="block text-sm font-semibold text-slate-300">
              Current stage
            </label>
            <select
              id="currentStage"
              name="currentStage"
              defaultValue={currentStage}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300"
            >
              <option value="start">Starting</option>
              <option value="run">Running</option>
              <option value="sell">Preparing to sell</option>
              <option value="buy">Looking to buy</option>
            </select>
          </div>

          {needsPolicyConsent && (
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
              <label className="flex items-start gap-3 text-sm text-slate-300">
                <input
                  name="acceptTerms"
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 accent-cyan-400"
                />
                <span>
                  I agree to the{" "}
                  <Link href={TERMS_POLICY_PATH} className="font-semibold text-cyan-300 hover:text-cyan-200">
                    Terms of Service
                  </Link>
                  .
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-slate-300">
                <input
                  name="acceptPrivacy"
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 accent-cyan-400"
                />
                <span>
                  I acknowledge the{" "}
                  <Link href={PRIVACY_POLICY_PATH} className="font-semibold text-cyan-300 hover:text-cyan-200">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Continue to dashboard
          </button>
        </form>
      </div>
    </section>
  );
}
