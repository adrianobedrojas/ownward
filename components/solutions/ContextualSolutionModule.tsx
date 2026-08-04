import { getTranslations } from "next-intl/server";
import ContextualSolutionRail from "@/components/solutions/ContextualSolutionRail";
import {
  getContextualSolutions,
  type ContextualRecommendationInput,
} from "@/lib/commerce/contextual-recommendations";

function reasonText(
  t: Awaited<ReturnType<typeof getTranslations>>,
  key: string,
): string {
  const map: Record<string, string> = {
    home_improve_valuation: t("reasons.home_improve_valuation"),
    home_increase_visibility: t("reasons.home_increase_visibility"),
    home_evaluate_acquisition: t("reasons.home_evaluate_acquisition"),
    pricing_one_time_goal: t("reasons.pricing_one_time_goal"),
    progress_needs_action_plan: t("reasons.progress_needs_action_plan"),
    published_listing_not_promoted: t("reasons.published_listing_not_promoted"),
    exit_preparation_focus: t("reasons.exit_preparation_focus"),
    multiple_saved_targets: t("reasons.multiple_saved_targets"),
    valuation_follow_up: t("reasons.valuation_follow_up"),
    owner_dependence_signal: t("reasons.owner_dependence_signal"),
    customer_risk_signal: t("reasons.customer_risk_signal"),
    assessment_identified_gaps: t("reasons.assessment_identified_gaps"),
    growth_to_execution_bridge: t("reasons.growth_to_execution_bridge"),
    valuation_to_buyer_lens: t("reasons.valuation_to_buyer_lens"),
    valuation_to_factors: t("reasons.valuation_to_factors"),
    valuation_to_improvement_plan: t("reasons.valuation_to_improvement_plan"),
    valuation_to_exit_prep: t("reasons.valuation_to_exit_prep"),
    readiness_multiple_categories: t("reasons.readiness_multiple_categories"),
    strong_readiness_sell_intent: t("reasons.strong_readiness_sell_intent"),
    sell_prepare_path: t("reasons.sell_prepare_path"),
    sell_promote_path: t("reasons.sell_promote_path"),
    sell_transaction_path: t("reasons.sell_transaction_path"),
    listing_post_publish_next_step: t("reasons.listing_post_publish_next_step"),
    confidential_listing_workflow: t("reasons.confidential_listing_workflow"),
    listing_age_engagement_signal: t("reasons.listing_age_engagement_signal"),
    buyer_viewing_public_listing: t("reasons.buyer_viewing_public_listing"),
    buyer_preference_progress: t("reasons.buyer_preference_progress"),
    buyer_repeated_browsing: t("reasons.buyer_repeated_browsing"),
    buyer_confidential_interaction: t("reasons.buyer_confidential_interaction"),
    single_serious_target: t("reasons.single_serious_target"),
    deal_room_empty_state: t("reasons.deal_room_empty_state"),
    deal_stage_negotiation_or_diligence: t("reasons.deal_stage_negotiation_or_diligence"),
    deal_stage_closing: t("reasons.deal_stage_closing"),
    deal_room_near_expiration: t("reasons.deal_room_near_expiration"),
    deal_needs_target_diligence: t("reasons.deal_needs_target_diligence"),
    document_driven_sale_workflow: t("reasons.document_driven_sale_workflow"),
    document_improvement_workflow: t("reasons.document_improvement_workflow"),
    portfolio_future_capacity: t("reasons.portfolio_future_capacity"),
    team_future_capacity: t("reasons.team_future_capacity"),
    progress_after_buyer_lens: t("reasons.progress_after_buyer_lens"),
    progress_after_value_dna: t("reasons.progress_after_value_dna"),
    progress_after_readiness: t("reasons.progress_after_readiness"),
    listing_promotion_management: t("reasons.listing_promotion_management"),
  };
  return map[key] ?? t("reasons.based_on_progress");
}

export default async function ContextualSolutionModule(
  input: ContextualRecommendationInput,
) {
  const recommendations = await getContextualSolutions(input);
  if (recommendations.length === 0) return null;

  const t = await getTranslations({ locale: input.locale, namespace: "Recommendations" });

  const localizedRecommendations = recommendations.map((recommendation) => ({
    ...recommendation,
    reasonText: reasonText(t, recommendation.reasonKey),
  }));

  return (
    <ContextualSolutionRail
      placement={input.placement}
      locale={input.locale}
      labels={{
        title: t("title"),
        subtitle: t("subtitle"),
        dismiss: t("dismiss"),
        dismissAnnouncement: t("dismissAnnouncement"),
        recommendedNextStep: t("recommendedNextStep"),
        includedInPlan: t("status.included"),
        planned: t("status.planned"),
        comingSoon: t("status.comingSoon"),
        purchase: t("cta.purchase"),
        open: t("cta.open"),
        continueText: t("cta.continue"),
        viewReport: t("cta.viewReport"),
        managePromotion: t("cta.managePromotion"),
        alreadyPurchased: t("cta.alreadyPurchased"),
        processing: t("cta.processing"),
        availableAgain: t("cta.availableAgain"),
        refunded: t("cta.refunded"),
        selectTarget: t("cta.selectTarget"),
        blocked: t("cta.blocked"),
        openDetails: t("cta.openDetails"),
      }}
      recommendations={localizedRecommendations}
    />
  );
}
