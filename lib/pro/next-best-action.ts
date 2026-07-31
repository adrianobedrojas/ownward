/**
 * Pro Deal Command Center — Next Best Action Engine
 *
 * Deterministic, pure-function NBA engine for Pro users.
 * Priority rules (1 = highest):
 *  1.  No business selected → select or create business
 *  2.  Critical profile fields missing → complete profile (< 50%)
 *  3.  No sale readiness assessment → run first readiness assessment
 *  4.  Stale readiness evidence (> 30 days) → refresh evidence
 *  5.  Critical customer concentration risk → address concentration
 *  6.  Weekly valuation refresh eligible → run valuation refresh
 *  7.  Listing incomplete (< 80%) → complete listing
 *  8.  Unanswered buyer inquiry → respond to inquiry
 *  9.  Qualified buyer without deal room → create deal room
 * 10.  Overdue due diligence request → resolve diligence request
 * 11.  Offer awaiting review → review offer
 * 12.  Missing critical sale document → upload document
 * 13.  Team seat available with unassigned work → assign team member
 * 14.  Highest-priority seller task overdue → complete task
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProNextBestAction = {
  rule: number;
  title: string;
  description: string;
  href: string;
  cta: string;
  priority: "critical" | "high" | "medium" | "info";
};

export type ProNbaInput = {
  // Rule 1: Business selection
  businessCount: number;
  activeBusinessId: string | null;

  // Rule 2: Profile completeness
  businessCompletion: number | null; // 0–100

  // Rule 3: Sale readiness
  hasSaleReadinessAssessment: boolean;
  lastReadinessAssessmentAt: string | null; // ISO timestamp

  // Rule 4: Evidence freshness
  oldestEvidenceDaysAgo: number | null; // days since oldest evidence update

  // Rule 5: Customer concentration
  concentrationRiskLevel: "low" | "moderate" | "high" | "critical" | null;

  // Rule 6: Valuation refresh
  valuationRefreshEligible: boolean;
  lastValuationAt: string | null;

  // Rule 7: Listing completeness
  listingCompletion: number | null; // 0–100; null = no listing
  hasListing: boolean;

  // Rule 8: Buyer inquiries
  unansweredInquiryCount: number;

  // Rule 9: Qualified buyers without deal rooms
  qualifiedBuyersWithoutRoomCount: number;

  // Rule 10: Overdue diligence requests
  overdueDiligenceRequestCount: number;

  // Rule 11: Offers awaiting review
  offersAwaitingReviewCount: number;

  // Rule 12: Missing critical documents
  missingCriticalDocCount: number;

  // Rule 13: Team seats
  teamSeatsAvailable: number;
  hasUnassignedWork: boolean;

  // Rule 14: Overdue tasks
  overdueTaskCount: number;
  highestPriorityOverdueTask: string | null;
};

// ─── NBA engine ───────────────────────────────────────────────────────────────

const EVIDENCE_STALE_THRESHOLD_DAYS = 30;

export function getProNextBestAction(input: ProNbaInput): ProNextBestAction {
  // Rule 1: No business selected
  if (input.businessCount === 0) {
    return {
      rule: 1,
      title: "Create Your First Business",
      description:
        "Set up a business workspace to unlock the Pro Deal Command Center.",
      href: "/business/new",
      cta: "Create Business",
      priority: "critical",
    };
  }

  if (!input.activeBusinessId) {
    return {
      rule: 1,
      title: "Select a Business",
      description:
        "Choose which business you want to work on from your portfolio.",
      href: "/portfolio",
      cta: "Select Business",
      priority: "critical",
    };
  }

  // Rule 2: Profile critically incomplete
  if (input.businessCompletion !== null && input.businessCompletion < 50) {
    return {
      rule: 2,
      title: "Complete Your Business Profile",
      description: `Your profile is ${input.businessCompletion}% complete. Buyers and readiness scoring require accurate data.`,
      href: "/business",
      cta: "Complete Profile",
      priority: "critical",
    };
  }

  // Rule 3: No sale readiness assessment
  if (!input.hasSaleReadinessAssessment) {
    return {
      rule: 3,
      title: "Run Your First Sale-Readiness Assessment",
      description:
        "Understand your sale readiness across 10 categories with a transparent 0–100 score.",
      href: "/sale-readiness",
      cta: "Start Assessment",
      priority: "high",
    };
  }

  // Rule 4: Stale readiness evidence
  if (
    input.oldestEvidenceDaysAgo !== null &&
    input.oldestEvidenceDaysAgo > EVIDENCE_STALE_THRESHOLD_DAYS
  ) {
    return {
      rule: 4,
      title: "Refresh Stale Readiness Evidence",
      description: `Some evidence is ${input.oldestEvidenceDaysAgo} days old. Update to maintain an accurate readiness score.`,
      href: "/sale-readiness",
      cta: "Update Evidence",
      priority: "high",
    };
  }

  // Rule 5: Critical customer concentration
  if (
    input.concentrationRiskLevel === "critical" ||
    input.concentrationRiskLevel === "high"
  ) {
    return {
      rule: 5,
      title: "Address Customer Concentration Risk",
      description:
        input.concentrationRiskLevel === "critical"
          ? "Critical concentration risk: one customer may represent a large portion of revenue. This significantly impacts sale value."
          : "High concentration risk: review your customer diversification to protect sale readiness.",
      href: "/customer-concentration",
      cta: "Review Concentration",
      priority: input.concentrationRiskLevel === "critical" ? "critical" : "high",
    };
  }

  // Rule 6: Weekly valuation refresh eligible
  if (input.valuationRefreshEligible) {
    return {
      rule: 6,
      title: "Refresh Your Weekly Valuation",
      description:
        "Your Pro plan includes one official valuation refresh per rolling 7 days. Run it now to see your latest estimate.",
      href: "/valuation",
      cta: "Refresh Valuation",
      priority: "medium",
    };
  }

  // Rule 7: Listing incomplete
  if (input.hasListing && input.listingCompletion !== null && input.listingCompletion < 80) {
    return {
      rule: 7,
      title: "Complete Your Listing",
      description: `Your listing is ${input.listingCompletion}% complete. Buyers expect a complete, professional listing.`,
      href: "/sell",
      cta: "Complete Listing",
      priority: "medium",
    };
  }

  // Rule 8: Unanswered buyer inquiry
  if (input.unansweredInquiryCount > 0) {
    return {
      rule: 8,
      title: `${input.unansweredInquiryCount} Unanswered Buyer Inquir${input.unansweredInquiryCount === 1 ? "y" : "ies"}`,
      description:
        "Timely responses to buyer inquiries build trust and maintain momentum.",
      href: "/messages",
      cta: "Reply Now",
      priority: "high",
    };
  }

  // Rule 9: Qualified buyer without deal room
  if (input.qualifiedBuyersWithoutRoomCount > 0) {
    return {
      rule: 9,
      title: `${input.qualifiedBuyersWithoutRoomCount} Qualified Buyer${input.qualifiedBuyersWithoutRoomCount === 1 ? "" : "s"} Without a Deal Room`,
      description:
        "Create a Deal Room to share confidential information securely with qualified buyers.",
      href: "/deals",
      cta: "Create Deal Room",
      priority: "high",
    };
  }

  // Rule 10: Overdue diligence request
  if (input.overdueDiligenceRequestCount > 0) {
    return {
      rule: 10,
      title: `${input.overdueDiligenceRequestCount} Overdue Diligence Request${input.overdueDiligenceRequestCount === 1 ? "" : "s"}`,
      description:
        "Overdue requests slow down due diligence and may cause buyers to lose confidence.",
      href: "/deals",
      cta: "Resolve Requests",
      priority: "high",
    };
  }

  // Rule 11: Offer awaiting review
  if (input.offersAwaitingReviewCount > 0) {
    return {
      rule: 11,
      title: `${input.offersAwaitingReviewCount} Offer${input.offersAwaitingReviewCount === 1 ? "" : "s"} Awaiting Review`,
      description:
        "Review incoming offers promptly to maintain buyer interest and negotiation momentum.",
      href: "/seller",
      cta: "Review Offers",
      priority: "critical",
    };
  }

  // Rule 12: Missing critical sale document
  if (input.missingCriticalDocCount > 0) {
    return {
      rule: 12,
      title: `${input.missingCriticalDocCount} Critical Sale Document${input.missingCriticalDocCount === 1 ? "" : "s"} Missing`,
      description:
        "Buyers and advisors expect key documents to be available during due diligence.",
      href: "/documents",
      cta: "Upload Documents",
      priority: "high",
    };
  }

  // Rule 13: Team seat available with unassigned work
  if (input.teamSeatsAvailable > 0 && input.hasUnassignedWork) {
    return {
      rule: 13,
      title: "Invite a Team Member",
      description: `You have ${input.teamSeatsAvailable} available seat${input.teamSeatsAvailable === 1 ? "" : "s"} and work that could be delegated.`,
      href: "/team",
      cta: "Invite Team Member",
      priority: "medium",
    };
  }

  // Rule 14: Highest-priority overdue task
  if (input.overdueTaskCount > 0) {
    return {
      rule: 14,
      title: input.highestPriorityOverdueTask
        ? `Overdue Task: "${input.highestPriorityOverdueTask}"`
        : `${input.overdueTaskCount} Overdue Task${input.overdueTaskCount === 1 ? "" : "s"}`,
      description:
        "Completing overdue tasks keeps your sale preparation on track.",
      href: "/tasks",
      cta: "View Tasks",
      priority: "medium",
    };
  }

  // Default: all clear
  return {
    rule: 14,
    title: "Your Deal Command Center is Up to Date",
    description:
      "No critical actions required. Keep monitoring your readiness, valuation, and buyer pipeline.",
    href: "/seller",
    cta: "View Seller Area",
    priority: "info",
  };
}
