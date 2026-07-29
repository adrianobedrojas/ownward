import { redirect } from "next/navigation";
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
            <label htmlFor="businessName" className="block text-sm font-semibold text-slate-300">
              Business name
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
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
              defaultValue="run"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300"
            >
              <option value="start">Starting</option>
              <option value="run">Running</option>
              <option value="sell">Preparing to sell</option>
              <option value="buy">Looking to buy</option>
            </select>
          </div>

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
