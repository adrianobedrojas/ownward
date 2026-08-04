"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserBillingState, checkLeadLimit } from "@/lib/billing";
import { canReadCRM, canWriteCRM } from "@/lib/business-access";

const CRM_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;
type CrmStage = (typeof CRM_STAGES)[number];

function isValidStage(s: string): s is CrmStage {
  return (CRM_STAGES as readonly string[]).includes(s);
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

async function resolveBusinessId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  explicitBusinessId: string | null
): Promise<string | null> {
  if (explicitBusinessId) return explicitBusinessId;
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_business_id")
    .eq("id", userId)
    .maybeSingle();
  return profile?.active_business_id ?? null;
}

// ─── Create lead ─────────────────────────────────────────────────────────────

export async function createLead(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  // Enforce active-lead quota (Explorer: 5, Starter: 25, Builder: 100, Pro: 1000)
  const billing = await getUserBillingState(supabase, user.id);

  // Count active leads (server-side quota check, never trust client)
  const { count: activeLeadCount } = await supabase
    .from("crm_contacts")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", user.id)
    .eq("record_type", "lead")
    .is("deleted_at", null);

  const limitError = checkLeadLimit(
    billing.entitlements,
    activeLeadCount ?? 0
  );
  if (limitError) {
    redirect(`/customers?error=LeadLimitReached&message=${encodeURIComponent(limitError.message)}`);
  }

  const name        = String(formData.get("name") ?? "").trim();
  const company     = String(formData.get("company") ?? "").trim() || null;
  const email       = String(formData.get("email") ?? "").trim() || null;
  const phone       = String(formData.get("phone") ?? "").trim() || null;
  const source      = String(formData.get("source") ?? "").trim() || null;
  const stage       = String(formData.get("stage") ?? "new");
  const requestedBusinessId = String(formData.get("business_id") ?? "").trim() || null;
  const estimatedValueStr = String(formData.get("estimated_value") ?? "").trim();
  const notes       = String(formData.get("notes") ?? "").trim() || null;

  if (!name || name.length > 200) redirect("/customers?error=InvalidName");
  if (!isValidStage(stage)) redirect("/customers?error=InvalidStage");

  const estimatedValue =
    estimatedValueStr ? parseFloat(estimatedValueStr) : null;
  if (estimatedValue !== null && (isNaN(estimatedValue) || estimatedValue < 0)) {
    redirect("/customers?error=InvalidValue");
  }

  const businessId = await resolveBusinessId(supabase, user.id, requestedBusinessId);
  if (!businessId) redirect("/customers?error=InvalidBusiness");

  const canWrite = await canWriteCRM(user.id, businessId);
  if (!canWrite) {
    redirect("/customers?error=Forbidden");
  }

  const { error: dbError } = await supabase.from("crm_contacts").insert({
    owner_user_id: user.id,
    business_id: businessId,
    record_type: "lead",
    name,
    company,
    email,
    phone,
    source,
    stage,
    estimated_value: estimatedValue,
    notes,
  });

  if (dbError) {
    console.error("createLead error:", dbError.message);
    redirect("/customers?error=DatabaseError");
  }

  revalidatePath("/customers");
  redirect("/customers?success=LeadCreated");
}

// ─── Update contact ───────────────────────────────────────────────────────────

export async function updateContact(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  // Enforce Builder-or-higher for CRM writes
  const billing = await getUserBillingState(supabase, user.id);
  if (!billing.entitlements.leadLimit) {
    redirect("/customers?error=UpgradeRequired");
  }

  const contactId = String(formData.get("contact_id") ?? "").trim();
  if (!contactId) redirect("/customers?error=MissingId");

  // Verify ownership
  const { data: contact } = await supabase
    .from("crm_contacts")
    .select("id, record_type, business_id")
    .eq("id", contactId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!contact) redirect("/customers?error=NotFound");

  if (!contact.business_id) redirect("/customers?error=InvalidBusiness");

  const canWrite = await canWriteCRM(user.id, contact.business_id);
  if (!canWrite) redirect("/customers?error=Forbidden");

  const name        = String(formData.get("name") ?? "").trim();
  const company     = String(formData.get("company") ?? "").trim() || null;
  const email       = String(formData.get("email") ?? "").trim() || null;
  const phone       = String(formData.get("phone") ?? "").trim() || null;
  const source      = String(formData.get("source") ?? "").trim() || null;
  const stage       = String(formData.get("stage") ?? "new");
  const notes       = String(formData.get("notes") ?? "").trim() || null;
  const estimatedValueStr = String(formData.get("estimated_value") ?? "").trim();
  const followUpStr = String(formData.get("next_follow_up_at") ?? "").trim() || null;

  if (!name || name.length > 200) redirect("/customers?error=InvalidName");
  if (!isValidStage(stage)) redirect("/customers?error=InvalidStage");

  const estimatedValue =
    estimatedValueStr ? parseFloat(estimatedValueStr) : null;
  if (estimatedValue !== null && (isNaN(estimatedValue) || estimatedValue < 0)) {
    redirect("/customers?error=InvalidValue");
  }

  const { error: dbError } = await supabase
    .from("crm_contacts")
    .update({
      name,
      company,
      email,
      phone,
      source,
      stage,
      estimated_value: estimatedValue,
      notes,
      next_follow_up_at: followUpStr,
    })
    .eq("id", contactId);

  if (dbError) {
    console.error("updateContact error:", dbError.message);
    redirect("/customers?error=DatabaseError");
  }

  revalidatePath("/customers");
  redirect("/customers?success=ContactUpdated");
}

// ─── Convert lead → customer ──────────────────────────────────────────────────

export async function convertLeadToCustomer(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  const contactId = String(formData.get("contact_id") ?? "").trim();
  if (!contactId) redirect("/customers?error=MissingId");

  const { data: contact } = await supabase
    .from("crm_contacts")
    .select("id, record_type, business_id")
    .eq("id", contactId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!contact || contact.record_type !== "lead") {
    redirect("/customers?error=NotFound");
  }

  if (!contact.business_id) redirect("/customers?error=InvalidBusiness");
  const canWrite = await canWriteCRM(user.id, contact.business_id);
  if (!canWrite) redirect("/customers?error=Forbidden");

  const { error: updateError } = await supabase
    .from("crm_contacts")
    .update({ record_type: "customer", stage: "won" })
    .eq("id", contactId);

  if (updateError) {
    console.error("convertLeadToCustomer error:", updateError.message);
    redirect("/customers?error=DatabaseError");
  }

  // Log activity
  await supabase.from("crm_activities").insert({
    contact_id: contactId,
    actor_user_id: user.id,
    activity_type: "conversion",
    subject: "Lead converted to customer",
  });

  revalidatePath("/customers");
  redirect("/customers?success=LeadConverted");
}

// ─── Archive (soft-delete) contact ───────────────────────────────────────────

export async function archiveContact(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  const contactId = String(formData.get("contact_id") ?? "").trim();
  if (!contactId) redirect("/customers?error=MissingId");

  const { data: contact } = await supabase
    .from("crm_contacts")
    .select("id, business_id")
    .eq("id", contactId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!contact || !contact.business_id) redirect("/customers?error=NotFound");
  const canWrite = await canWriteCRM(user.id, contact.business_id);
  if (!canWrite) redirect("/customers?error=Forbidden");

  const { error: dbError } = await supabase
    .from("crm_contacts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", contactId)
    .is("deleted_at", null);

  if (dbError) {
    console.error("archiveContact error:", dbError.message);
    redirect("/customers?error=DatabaseError");
  }

  revalidatePath("/customers");
  redirect("/customers?success=Archived");
}

// ─── Restore archived contact ─────────────────────────────────────────────────

export async function restoreContact(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  const contactId = String(formData.get("contact_id") ?? "").trim();
  if (!contactId) redirect("/customers?error=MissingId");

  const { data: contact } = await supabase
    .from("crm_contacts")
    .select("id, business_id")
    .eq("id", contactId)
    .maybeSingle();

  if (!contact || !contact.business_id) redirect("/customers?error=NotFound");
  const canRead = await canReadCRM(user.id, contact.business_id);
  if (!canRead) redirect("/customers?error=Forbidden");

  const { error: dbError } = await supabase
    .from("crm_contacts")
    .update({ deleted_at: null })
    .eq("id", contactId);

  if (dbError) {
    console.error("restoreContact error:", dbError.message);
    redirect("/customers?error=DatabaseError");
  }

  revalidatePath("/customers");
  redirect("/customers?success=Restored");
}
