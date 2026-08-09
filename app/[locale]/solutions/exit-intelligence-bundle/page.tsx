import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewBusiness } from "@/lib/business-access";
import { buildExitIntelligence } from "@/lib/exit-intelligence/build-exit-intelligence";
import ExitIntelligenceClient from "./ExitIntelligenceClient";

export const metadata: Metadata = {
  title: "Exit Intelligence Bundle | Ownward",
  description:
    "A unified command center for valuation, sale readiness, transfer risk, buyer perspective, and next actions.",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ExitIntelligenceBundlePage({ params, searchParams }: PageProps) {
  const { locale: routeLocale } = await params;
  const locale: "en" | "es" = routeLocale === "es" ? "es" : "en";
  const { businessId: rawBusinessId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/solutions/exit-intelligence-bundle`);
  }

  // Load user's businesses
  const { data: businessRows } = await supabase
    .from("businesses")
    .select("id, name, created_at")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const businesses = (businessRows ?? []) as { id: string; name: string; created_at: string }[];

  if (businesses.length === 0) {
    return (
      <ExitIntelligenceClient
        locale={locale}
        businesses={[]}
        selectedBusinessId={null}
        exitData={null}
      />
    );
  }

  // Resolve selected business — server-side validate, never trust raw param
  let selectedBusinessId: string | null = null;

  if (isUuid(rawBusinessId)) {
    const allowed = await canViewBusiness(user.id, rawBusinessId);
    if (allowed) {
      selectedBusinessId = rawBusinessId;
    }
  }

  // Fall back to most recent business
  if (!selectedBusinessId) {
    selectedBusinessId = businesses[0].id;
  }

  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId) ?? businesses[0];

  // Load latest non-deleted sale readiness assessment for this user+business
  const { data: assessmentRow } = await supabase
    .from("sale_readiness_assessments")
    .select(
      "overall_score, stage, category_results, strongest_category, weakest_category, delta_from_previous, scored_at"
    )
    .eq("user_id", user.id)
    .eq("business_id", selectedBusinessId)
    .is("deleted_at", null)
    .order("scored_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Load most recent calculated valuation linked to this business
  // IMPORTANT: Only use reports with business_id = selectedBusinessId (never NULL or other business)
  const { data: valuationRow } = await supabase
    .from("valuation_reports")
    .select(
      "id, business_id, business_name, industry, currency, defensive_value, expected_value, strategic_value, confidence_score, result_snapshot, report_level, updated_at"
    )
    .eq("user_id", user.id)
    .eq("business_id", selectedBusinessId)
    .eq("status", "calculated")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const exitData = buildExitIntelligence(
    selectedBusinessId,
    selectedBusiness.name,
    assessmentRow ?? null,
    valuationRow ?? null
  );

  return (
    <ExitIntelligenceClient
      locale={locale}
      businesses={businesses}
      selectedBusinessId={selectedBusinessId}
      exitData={exitData}
    />
  );
}
