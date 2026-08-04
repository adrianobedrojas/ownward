"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivacyConsent } from "@/components/PrivacyConsent";
import ContextualSolutionCard from "@/components/solutions/ContextualSolutionCard";
import type { ContextualRecommendation } from "@/lib/commerce/contextual-recommendations";
import type { SolutionPlacement } from "@/lib/commerce/solution-placements";

type Labels = {
  title: string;
  subtitle: string;
  dismiss: string;
  dismissAnnouncement: string;
  recommendedNextStep: string;
  includedInPlan: string;
  planned: string;
  comingSoon: string;
  purchase: string;
  open: string;
  continueText: string;
  viewReport: string;
  managePromotion: string;
  alreadyPurchased: string;
  processing: string;
  availableAgain: string;
  refunded: string;
  selectTarget: string;
  blocked: string;
  openDetails: string;
};

type Props = {
  placement: SolutionPlacement;
  locale: "en" | "es";
  labels: Labels;
  recommendations: Array<ContextualRecommendation & { reasonText: string }>;
};

function getInitialDismissed(storageKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

function trackEvent(
  eventName: string,
  recommendation: ContextualRecommendation,
  analyticsEnabled: boolean,
) {
  if (!analyticsEnabled || typeof window === "undefined") return;
  const gtag = (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (!gtag) return;

  gtag("event", eventName, {
    placement: recommendation.analytics.placement,
    product_key: recommendation.analytics.product_key,
    status: recommendation.analytics.status,
    billing_model: recommendation.analytics.billing_model,
    price_band: recommendation.analytics.price_band,
    recommendation_reason_key: recommendation.analytics.recommendation_reason_key,
  });
}

export default function ContextualSolutionRail({
  placement,
  locale,
  labels,
  recommendations,
}: Props) {
  const { consent } = usePrivacyConsent();
  const analyticsEnabled = Boolean(consent?.analytics);
  const storageKey = useMemo(() => `solution-recommendation-dismissed:${placement}`, [placement]);
  const [dismissed, setDismissed] = useState(() => getInitialDismissed(storageKey));
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    for (const recommendation of recommendations) {
      trackEvent("solution_recommendation_viewed", recommendation, analyticsEnabled);
    }
  }, [analyticsEnabled, recommendations]);

  if (dismissed || recommendations.length === 0) {
    return null;
  }

  const allowDismiss = recommendations.some((item) => item.dismissible);

  function dismissRail() {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {}
    setDismissed(true);
    setAnnouncement(labels.dismissAnnouncement);
    for (const recommendation of recommendations) {
      trackEvent("solution_recommendation_dismissed", recommendation, analyticsEnabled);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5" aria-labelledby={`${placement}-recommendation-heading`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{labels.recommendedNextStep}</p>
          <h2 id={`${placement}-recommendation-heading`} className="mt-1 text-xl font-semibold text-white">{labels.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{labels.subtitle}</p>
        </div>
        {allowDismiss ? (
          <button
            type="button"
            onClick={dismissRail}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            {labels.dismiss}
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {recommendations.map((recommendation) => (
          <ContextualSolutionCard
            key={`${placement}-${recommendation.productKey}`}
            recommendation={recommendation}
            locale={locale}
            labels={labels}
            reasonText={recommendation.reasonText}
            onAction={(eventName, target) => trackEvent(eventName, target, analyticsEnabled)}
          />
        ))}
      </div>

      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </section>
  );
}
