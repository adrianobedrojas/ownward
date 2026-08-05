import type { ProductKey } from "@/lib/commerce/products";

export type SolutionPlacement =
  | "home"
  | "pricing"
  | "dashboard"
  | "business_workspace"
  | "business_health"
  | "growth_planner"
  | "valuation"
  | "valuation_result"
  | "sale_readiness"
  | "customer_concentration"
  | "sell_landing"
  | "listing_studio"
  | "listing_management"
  | "seller_command_center"
  | "public_listing"
  | "buy_marketplace"
  | "saved_listings"
  | "buyer_preferences"
  | "deal_rooms"
  | "deal_room"
  | "documents"
  | "portfolio"
  | "team"
  | "my_purchases";

export type PlacementCandidate = {
  productKey: ProductKey;
  baseScore: number;
  reasonKey: string;
};

export type PlacementConfig = {
  maxItems: number;
  dismissible: boolean;
  candidates: PlacementCandidate[];
};

const C = (productKey: ProductKey, baseScore: number, reasonKey: string): PlacementCandidate => ({
  productKey,
  baseScore,
  reasonKey,
});

export const PLACEMENT_CONFIG: Record<SolutionPlacement, PlacementConfig> = {
  home: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("value_dna_snapshot", 100, "home_improve_valuation"),
      C("featured_listing", 95, "home_increase_visibility"),
      C("business_comparison_pack", 90, "home_evaluate_acquisition"),
    ],
  },
  pricing: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("buyer_lens_memo", 100, "pricing_one_time_goal"),
      C("value_dna_snapshot", 95, "pricing_one_time_goal"),
      C("value_action_sprint", 90, "pricing_one_time_goal"),
    ],
  },
  dashboard: {
    maxItems: 1,
    dismissible: true,
    candidates: [
      C("value_action_sprint", 100, "progress_needs_action_plan"),
      C("featured_listing", 95, "published_listing_not_promoted"),
      C("sale_readiness_blueprint", 90, "exit_preparation_focus"),
      C("business_comparison_pack", 85, "multiple_saved_targets"),
      C("value_dna_snapshot", 80, "valuation_follow_up"),
    ],
  },
  business_workspace: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("owner_dependence_scan", 100, "owner_dependence_signal"),
      C("customer_risk_scan", 95, "customer_risk_signal"),
      C("value_dna_snapshot", 92, "valuation_follow_up"),
      C("sale_readiness_blueprint", 90, "exit_preparation_focus"),
      C("value_action_sprint", 85, "progress_needs_action_plan"),
    ],
  },
  business_health: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("owner_dependence_scan", 100, "assessment_identified_gaps"),
      C("customer_risk_scan", 96, "assessment_identified_gaps"),
      C("value_improvement_roadmap", 90, "assessment_identified_gaps"),
      C("value_action_sprint", 88, "assessment_identified_gaps"),
    ],
  },
  growth_planner: {
    maxItems: 2,
    dismissible: true,
    candidates: [
      C("value_improvement_roadmap", 100, "growth_to_execution_bridge"),
      C("value_action_sprint", 95, "growth_to_execution_bridge"),
    ],
  },
  valuation: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("buyer_lens_memo", 100, "valuation_to_buyer_lens"),
      C("value_dna_snapshot", 95, "valuation_to_factors"),
      C("value_improvement_roadmap", 90, "valuation_to_improvement_plan"),
      C("value_action_sprint", 88, "valuation_to_improvement_plan"),
      C("exit_intelligence_bundle", 84, "valuation_to_exit_prep"),
    ],
  },
  valuation_result: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("buyer_lens_memo", 100, "valuation_to_buyer_lens"),
      C("value_action_sprint", 95, "valuation_to_improvement_plan"),
      C("exit_intelligence_bundle", 90, "valuation_to_exit_prep"),
    ],
  },
  sale_readiness: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("owner_dependence_scan", 100, "owner_dependence_signal"),
      C("customer_risk_scan", 98, "customer_risk_signal"),
      C("sale_readiness_blueprint", 95, "readiness_multiple_categories"),
      C("confidential_sale_launch", 90, "strong_readiness_sell_intent"),
      C("buyer_lens_memo", 86, "valuation_to_buyer_lens"),
    ],
  },
  customer_concentration: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("customer_risk_scan", 100, "customer_risk_signal"),
      C("sale_readiness_blueprint", 95, "readiness_multiple_categories"),
      C("value_action_sprint", 90, "progress_needs_action_plan"),
    ],
  },
  sell_landing: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("sale_readiness_blueprint", 100, "sell_prepare_path"),
      C("featured_listing", 95, "sell_promote_path"),
      C("deal_room_90", 90, "sell_transaction_path"),
    ],
  },
  listing_studio: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("featured_listing", 100, "published_listing_not_promoted"),
      C("quick_boost", 95, "listing_post_publish_next_step"),
      C("market_spotlight", 90, "listing_post_publish_next_step"),
      C("confidential_exposure", 88, "confidential_listing_workflow"),
    ],
  },
  listing_management: {
    maxItems: 1,
    dismissible: true,
    candidates: [
      C("featured_listing", 100, "published_listing_not_promoted"),
      C("listing_relaunch", 95, "listing_age_engagement_signal"),
      C("confidential_exposure", 90, "confidential_listing_workflow"),
    ],
  },
  seller_command_center: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("featured_listing", 100, "published_listing_not_promoted"),
      C("listing_relaunch", 95, "listing_age_engagement_signal"),
      C("market_spotlight", 90, "listing_post_publish_next_step"),
      C("sale_readiness_blueprint", 85, "exit_preparation_focus"),
    ],
  },
  public_listing: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("business_comparison_pack", 100, "buyer_viewing_public_listing"),
      C("buyer_diligence_pass", 95, "buyer_viewing_public_listing"),
      C("acquisition_workspace", 90, "buyer_viewing_public_listing"),
      C("priority_buyer_verification", 88, "buyer_viewing_public_listing"),
    ],
  },
  buy_marketplace: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("acquisition_readiness_profile", 100, "buyer_preference_progress"),
      C("acquisition_scout", 95, "buyer_repeated_browsing"),
      C("business_comparison_pack", 90, "multiple_saved_targets"),
      C("priority_buyer_verification", 85, "buyer_confidential_interaction"),
    ],
  },
  saved_listings: {
    maxItems: 1,
    dismissible: true,
    candidates: [
      C("business_comparison_pack", 100, "multiple_saved_targets"),
      C("acquisition_readiness_profile", 95, "buyer_preference_progress"),
      C("acquisition_scout", 90, "buyer_repeated_browsing"),
      C("buyer_diligence_pass", 86, "single_serious_target"),
    ],
  },
  buyer_preferences: {
    maxItems: 1,
    dismissible: true,
    candidates: [
      C("acquisition_readiness_profile", 100, "buyer_preference_progress"),
      C("acquisition_scout", 95, "buyer_preference_progress"),
    ],
  },
  deal_rooms: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("deal_room_90", 100, "deal_room_empty_state"),
      C("transaction_workspace", 95, "deal_stage_negotiation_or_diligence"),
      C("closing_archive", 90, "deal_stage_closing"),
    ],
  },
  deal_room: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("deal_room_extension", 100, "deal_room_near_expiration"),
      C("transaction_workspace", 95, "deal_stage_negotiation_or_diligence"),
      C("closing_archive", 90, "deal_stage_closing"),
      C("buyer_diligence_pass", 86, "deal_needs_target_diligence"),
    ],
  },
  documents: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("confidential_sale_launch", 100, "document_driven_sale_workflow"),
      C("deal_room_90", 95, "document_driven_sale_workflow"),
      C("closing_archive", 90, "document_driven_sale_workflow"),
      C("value_action_sprint", 85, "document_improvement_workflow"),
    ],
  },
  portfolio: {
    maxItems: 1,
    dismissible: true,
    candidates: [
      C("essential_intelligence_pack", 100, "portfolio_future_capacity"),
      C("enhanced_intelligence_pack", 95, "portfolio_future_capacity"),
    ],
  },
  team: {
    maxItems: 1,
    dismissible: true,
    candidates: [
      C("launch_intelligence_pack", 100, "team_future_capacity"),
      C("verified_listing_pack", 95, "team_future_capacity"),
    ],
  },
  my_purchases: {
    maxItems: 3,
    dismissible: true,
    candidates: [
      C("value_dna_snapshot", 100, "progress_after_buyer_lens"),
      C("value_action_sprint", 95, "progress_after_value_dna"),
      C("sale_readiness_blueprint", 90, "progress_after_readiness"),
      C("featured_listing", 85, "listing_promotion_management"),
    ],
  },
};
