"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getUserBillingState,
  checkBusinessLimit,
} from "@/lib/billing";

export type BusinessActionResult =
  | { success: true; businessId: string }
  | { success: false; message: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { authenticated: false as const };
  return { authenticated: true as const, supabase, user };
}

function calcCompletion(data: Record<string, unknown>): number {
  const fields = [
    "name",
    "description",
    "industry",
    "location",
    "website",
    "year_established",
    "business_stage",
    "business_model",
    "primary_customer",
    "employee_count",
    "annual_revenue",
    "owner_role",
  ];
  const filled = fields.filter((f) => {
    const v = data[f];
    return v !== null && v !== undefined && String(v).trim() !== "";
  });
  return Math.round((filled.length / fields.length) * 100);
}

// ─── createBusiness ───────────────────────────────────────────────────────────

export async function createBusiness(
  formData: FormData
): Promise<BusinessActionResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.authenticated) {
    return { success: false, message: "You must be signed in." };
  }
  const { supabase, user } = auth;

  // Entitlement check: must have a paid plan and be within businessLimit
  const billing = await getUserBillingState(supabase, user.id);
  const { count: currentCount } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .is("deleted_at", null);

  const limitError = checkBusinessLimit(billing.entitlements, currentCount ?? 0);
  if (limitError) {
    return { success: false, message: limitError.message };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { success: false, message: "Business name is required." };
  }

  const description = String(formData.get("description") ?? "").trim() || null;
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const website = String(formData.get("website") ?? "").trim() || null;
  const yearEstablished =
    formData.get("year_established")
      ? parseInt(String(formData.get("year_established")), 10) || null
      : null;
  const businessStage = String(formData.get("business_stage") ?? "").trim() || null;
  const businessModel = String(formData.get("business_model") ?? "").trim() || null;
  const primaryCustomer = String(formData.get("primary_customer") ?? "").trim() || null;
  const employeeCount = formData.get("employee_count")
    ? parseInt(String(formData.get("employee_count")), 10) || null
    : null;
  const annualRevenue = formData.get("annual_revenue")
    ? parseFloat(String(formData.get("annual_revenue"))) || null
    : null;
  const ownerRole = String(formData.get("owner_role") ?? "").trim() || null;

  // Generate a unique slug
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  const slug = `${baseSlug}-${Date.now()}`;

  const payload = {
    owner_id: user.id,
    name,
    slug,
    description,
    industry,
    location,
    website,
    year_established: yearEstablished,
    business_stage: businessStage,
    business_model: businessModel,
    primary_customer: primaryCustomer,
    employee_count: employeeCount,
    annual_revenue: annualRevenue,
    owner_role: ownerRole,
    is_public: false,
  };

  const { data, error: insertError } = await supabase
    .from("businesses")
    .insert({
      ...payload,
      profile_completion: calcCompletion(payload),
    })
    .select("id")
    .single();

  if (insertError || !data) {
    console.error("createBusiness error:", insertError?.message);
    return { success: false, message: "Failed to create business. Please try again." };
  }

  // Set as active business in profile
  await supabase
    .from("profiles")
    .update({ active_business_id: data.id })
    .eq("id", user.id);

  // Create initial startup milestones for idea/pre_revenue stage
  if (businessStage === 'idea' || businessStage === 'pre_revenue') {
    const milestones = [
      { title: 'Interview five potential customers', category: 'customer' },
      { title: 'Define the first paid offer', category: 'customer' },
      { title: 'Estimate startup costs', category: 'finance' },
      { title: 'Research registration and license requirements', category: 'formation' },
      { title: 'Set up bookkeeping and payment collection', category: 'operations' },
      { title: 'Create a first-customer outreach plan', category: 'marketing' },
      { title: 'Choose a target launch date', category: 'operations' },
    ];
    try {
      // Use upsert with onConflict to avoid duplicates on retry
      await supabase.from('business_milestones').insert(
        milestones.map((m) => ({
          user_id: user.id,
          business_id: data.id,
          title: m.title,
          category: m.category,
          status: 'planned',
        }))
      );
    } catch (milestoneErr) {
      // Non-critical — log but do not fail business creation
      console.error('createBusiness milestone insert error:', milestoneErr);
    }
  }

  revalidatePath("/business");
  revalidatePath("/dashboard");
  return { success: true, businessId: data.id };
}

// ─── updateBusiness ───────────────────────────────────────────────────────────

export async function updateBusiness(
  formData: FormData
): Promise<BusinessActionResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.authenticated) {
    return { success: false, message: "You must be signed in." };
  }
  const { supabase, user } = auth;

  const businessId = String(formData.get("business_id") ?? "").trim();
  if (!businessId) {
    return { success: false, message: "Missing business ID." };
  }

  // Ownership validation — never trust client-supplied user_id
  const { data: existing } = await supabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing || existing.owner_id !== user.id) {
    return { success: false, message: "Business not found or access denied." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { success: false, message: "Business name is required." };
  }

  const description = String(formData.get("description") ?? "").trim() || null;
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const website = String(formData.get("website") ?? "").trim() || null;
  const yearEstablished = formData.get("year_established")
    ? parseInt(String(formData.get("year_established")), 10) || null
    : null;
  const businessStage = String(formData.get("business_stage") ?? "").trim() || null;
  const businessModel = String(formData.get("business_model") ?? "").trim() || null;
  const primaryCustomer = String(formData.get("primary_customer") ?? "").trim() || null;
  const employeeCount = formData.get("employee_count")
    ? parseInt(String(formData.get("employee_count")), 10) || null
    : null;
  const annualRevenue = formData.get("annual_revenue")
    ? parseFloat(String(formData.get("annual_revenue"))) || null
    : null;
  const ownerRole = String(formData.get("owner_role") ?? "").trim() || null;

  const updates = {
    name,
    description,
    industry,
    location,
    website,
    year_established: yearEstablished,
    business_stage: businessStage,
    business_model: businessModel,
    primary_customer: primaryCustomer,
    employee_count: employeeCount,
    annual_revenue: annualRevenue,
    owner_role: ownerRole,
    profile_completion: calcCompletion({
      name,
      description,
      industry,
      location,
      website,
      year_established: yearEstablished,
      business_stage: businessStage,
      business_model: businessModel,
      primary_customer: primaryCustomer,
      employee_count: employeeCount,
      annual_revenue: annualRevenue,
      owner_role: ownerRole,
    }),
  };

  const { error } = await supabase
    .from("businesses")
    .update(updates)
    .eq("id", businessId)
    .eq("owner_id", user.id);

  if (error) {
    return { success: false, message: "Failed to update business." };
  }

  revalidatePath("/business");
  revalidatePath(`/business/${businessId}`);
  return { success: true, businessId };
}

// ─── setActiveBusiness ────────────────────────────────────────────────────────

export async function setActiveBusiness(
  businessId: string
): Promise<{ success: boolean; message?: string }> {
  const auth = await getAuthenticatedUser();
  if (!auth.authenticated) {
    return { success: false, message: "You must be signed in." };
  }
  const { supabase, user } = auth;

  // Validate ownership
  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!biz) {
    return { success: false, message: "Business not found or access denied." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ active_business_id: businessId })
    .eq("id", user.id);

  if (error) {
    return { success: false, message: "Failed to set active business." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/business");
  redirect("/dashboard");
}

// ─── createBusinessAction (form action wrapper with redirect) ─────────────────

export async function createBusinessAction(formData: FormData): Promise<void> {
  const result = await createBusiness(formData);
  if (result.success) {
    redirect(`/business?created=1`);
  }
  // On error, redirect back with error param
  const msg = encodeURIComponent(result.message);
  redirect(`/business/new?error=${msg}`);
}

// ─── updateBusinessAction (form action wrapper) ───────────────────────────────

export async function updateBusinessAction(formData: FormData): Promise<void> {
  const result = await updateBusiness(formData);
  const businessId = String(formData.get("business_id") ?? "").trim();
  if (result.success) {
    redirect(`/business/${businessId}?updated=1`);
  }
  const msg = encodeURIComponent(result.message);
  redirect(`/business/${businessId}?error=${msg}`);
}
