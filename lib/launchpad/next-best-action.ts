/**
 * Starter Launchpad – Next Best Action engine.
 *
 * Pure, deterministic function — easily unit-testable.
 * Priority rules (highest first):
 *  1. No business workspace → Create Business Passport
 *  2. Business incomplete (<50%) → Complete missing fields
 *  3. No health assessment → Take health check
 *  4. No milestones → Add first milestone
 *  5. <3 documents → Organize first docs
 *  6. No valuation → Calculate basic snapshot
 *  7. Otherwise → oldest incomplete milestone or lowest health category
 */

export type NextBestAction = {
  rule: number;
  title: string;
  description: string;
  href: string;
  cta: string;
};

export type LaunchpadInput = {
  businessCount: number;
  businessCompletion: number | null; // 0–100, null if no business
  hasHealthAssessment: boolean;
  milestoneCount: number;
  documentCount: number;
  hasValuation: boolean;
  /** Optional: oldest incomplete milestone title */
  oldestIncompleteMilestone?: string | null;
  /** Optional: lowest scoring health category label */
  lowestHealthCategory?: string | null;
};

export function getNextBestAction(input: LaunchpadInput): NextBestAction {
  // Rule 1: No business
  if (input.businessCount === 0) {
    return {
      rule: 1,
      title: "Create Your Business Passport",
      description:
        "Set up your business workspace to unlock milestones, health check, valuation, and more.",
      href: "/business/new",
      cta: "Create Business",
    };
  }

  // Rule 2: Business incomplete
  if (
    input.businessCompletion !== null &&
    input.businessCompletion < 50
  ) {
    return {
      rule: 2,
      title: "Complete Your Business Profile",
      description: `Your profile is ${input.businessCompletion}% complete. Add missing details to get better insights.`,
      href: "/business",
      cta: "Complete Profile",
    };
  }

  // Rule 3: No health assessment
  if (!input.hasHealthAssessment) {
    return {
      rule: 3,
      title: "Take Your First Health Check",
      description:
        "Assess your business across 6 key categories and get your top 3 next actions.",
      href: "/health",
      cta: "Start Health Check",
    };
  }

  // Rule 4: No milestones
  if (input.milestoneCount === 0) {
    return {
      rule: 4,
      title: "Add Your First Milestone",
      description:
        "Track the key events and goals in your business journey with a milestone.",
      href: "/milestones",
      cta: "Add Milestone",
    };
  }

  // Rule 5: <3 documents
  if (input.documentCount < 3) {
    return {
      rule: 5,
      title: "Organize Your First Documents",
      description:
        "Upload key documents like licenses, contracts, or financial records to your vault.",
      href: "/documents",
      cta: "Upload Documents",
    };
  }

  // Rule 6: No valuation
  if (!input.hasValuation) {
    return {
      rule: 6,
      title: "Calculate Your Business Value",
      description:
        "Get a basic valuation snapshot to understand what your business is worth.",
      href: "/valuation",
      cta: "Calculate Value",
    };
  }

  // Rule 7: Oldest incomplete milestone or lowest health category
  if (input.oldestIncompleteMilestone) {
    return {
      rule: 7,
      title: "Progress a Milestone",
      description: `Work on: "${input.oldestIncompleteMilestone}"`,
      href: "/milestones",
      cta: "View Milestones",
    };
  }

  if (input.lowestHealthCategory) {
    return {
      rule: 7,
      title: "Improve Your Health Score",
      description: `Focus on improving: ${input.lowestHealthCategory}`,
      href: "/health",
      cta: "Take Health Check",
    };
  }

  // Default
  return {
    rule: 7,
    title: "Your Business is Looking Good!",
    description:
      "Keep tracking milestones and reviewing your health score regularly.",
    href: "/dashboard",
    cta: "View Dashboard",
  };
}
