"use client";

import Link from "next/link";
import SolutionCheckoutButton from "@/components/solutions/SolutionCheckoutButton";
import RecommendationReason from "@/components/solutions/RecommendationReason";
import type { ContextualRecommendation } from "@/lib/commerce/contextual-recommendations";

type Labels = {
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
  dismiss: string;
  openDetails: string;
};

type Props = {
  recommendation: ContextualRecommendation;
  locale: "en" | "es";
  labels: Labels;
  reasonText: string;
  onAction: (eventName: string, recommendation: ContextualRecommendation) => void;
};

function badgeText(rec: ContextualRecommendation, labels: Labels): string {
  if (rec.includedInPlan) return labels.includedInPlan;
  if (rec.ctaState === "planned") return labels.planned;
  if (rec.ctaState === "coming_soon") return labels.comingSoon;
  if (rec.ctaState === "refunded") return labels.refunded;
  if (rec.ctaState === "processing") return labels.processing;
  return rec.status;
}

export default function ContextualSolutionCard({
  recommendation,
  locale,
  labels,
  reasonText,
  onAction,
}: Props) {
  const stateLabelMap: Record<string, string> = {
    open: labels.open,
    continue: labels.continueText,
    view_report: labels.viewReport,
    manage_promotion: labels.managePromotion,
    already_purchased: labels.alreadyPurchased,
    processing: labels.processing,
    available_again: labels.availableAgain,
    refunded: labels.refunded,
    planned: labels.planned,
    coming_soon: labels.comingSoon,
    select_target: labels.selectTarget,
    blocked: labels.blocked,
    purchase: labels.purchase,
  };

  const stateText = stateLabelMap[recommendation.ctaState] ?? labels.openDetails;

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-white">{recommendation.name}</h3>
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300">
          {badgeText(recommendation, labels)}
        </span>
      </div>

      <RecommendationReason text={reasonText} />
      <p className="mt-2 text-sm text-slate-300">{recommendation.description}</p>
      <p className="mt-1 text-xs text-slate-400">{recommendation.outcome}</p>

      <p className="mt-3 text-sm font-semibold text-cyan-300">
        {recommendation.displayPrice === 0 ? (locale === "es" ? "Gratis" : "Free") : `$${recommendation.displayPrice}`} · {recommendation.billingContext}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {recommendation.ctaState === "purchase" || recommendation.ctaState === "select_target" ? (
          <SolutionCheckoutButton
            productKey={recommendation.productKey}
            locale={locale}
            ctaBehavior="checkout"
            status={recommendation.status === "active" ? "active" : "planned"}
            analyticsSource={`contextual:${recommendation.analytics.placement}`}
            requiredTargetType={recommendation.targetType}
            targetId={recommendation.targetId ?? undefined}
            targetOptions={recommendation.targetOptions}
            onStartCheckout={() => onAction("solution_checkout_started", recommendation)}
          />
        ) : recommendation.ctaState === "open" && recommendation.ctaHref ? (
          <SolutionCheckoutButton
            productKey={recommendation.productKey}
            locale={locale}
            ctaBehavior="open"
            status={recommendation.status === "active" ? "active" : "planned"}
            accessRoute={recommendation.ctaHref}
            analyticsSource={`contextual:${recommendation.analytics.placement}`}
            requiredTargetType="none"
            onStartFree={() => onAction("free_solution_started", recommendation)}
          />
        ) : recommendation.ctaHref ? (
          <Link
            href={recommendation.ctaHref}
            onClick={() => onAction("solution_recommendation_clicked", recommendation)}
            className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
          >
            {stateText}
          </Link>
        ) : (
          <span className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300">
            {stateText}
          </span>
        )}

        <Link
          href={recommendation.detailRoute}
          onClick={() => onAction("solution_detail_opened", recommendation)}
          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-300"
        >
          {labels.openDetails}
        </Link>
      </div>
    </article>
  );
}
