/**
 * Centralized business authorization helpers.
 *
 * Never trust a role sent from the browser. Always look up the role
 * server-side from business_members using the authenticated user's ID.
 */

import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BusinessRole = "owner" | "manager" | "finance" | "operations" | "viewer";
export type MemberStatus = "active" | "suspended";
export type AccessMode = "read" | "write";
export type DocumentCategory = "financial" | "operational" | "general";

export interface BusinessAccess {
  role: BusinessRole;
  status: MemberStatus;
  memberId: string | null;
}

// ─── Core lookup ──────────────────────────────────────────────────────────────

/**
 * Returns the authenticated user's access record for a given business,
 * or null if they have no access (not a member, not the owner, suspended, etc.).
 */
export async function getBusinessAccess(
  userId: string,
  businessId: string
): Promise<BusinessAccess | null> {
  const supabase = await createClient();

  // Check if user is the owner
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!biz) return null;

  if (biz.owner_id === userId) {
    return { role: "owner", status: "active", memberId: null };
  }

  // Check business_members
  const { data: member } = await supabase
    .from("business_members")
    .select("id, role, status")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!member) return null;

  return {
    role: member.role as BusinessRole,
    status: member.status as MemberStatus,
    memberId: member.id,
  };
}

/** Returns true if the user has active access (not suspended/removed). */
function isActive(access: BusinessAccess | null): boolean {
  return access !== null && access.status === "active";
}

// ─── Permission helpers ───────────────────────────────────────────────────────

export async function canViewBusiness(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  return isActive(access);
}

export async function canEditBusiness(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  if (!isActive(access)) return false;
  return access!.role === "owner" || access!.role === "manager";
}

export async function canAccessCRM(
  userId: string,
  businessId: string,
  mode: AccessMode
): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  if (!isActive(access)) return false;
  const role = access!.role;
  if (mode === "read") {
    return ["owner", "manager", "finance", "operations", "viewer"].includes(role);
  }
  // write
  return ["owner", "manager", "operations"].includes(role);
}

export async function canAccessOperations(
  userId: string,
  businessId: string,
  mode: AccessMode
): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  if (!isActive(access)) return false;
  const role = access!.role;
  if (mode === "read") {
    return ["owner", "manager", "finance", "operations", "viewer"].includes(role);
  }
  return ["owner", "manager", "operations"].includes(role);
}

export async function canAccessFinance(
  userId: string,
  businessId: string,
  mode: AccessMode
): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  if (!isActive(access)) return false;
  const role = access!.role;
  if (mode === "read") {
    return ["owner", "manager", "finance", "viewer"].includes(role);
  }
  return ["owner", "finance"].includes(role);
}

export async function canAccessDocuments(
  userId: string,
  businessId: string,
  category: DocumentCategory,
  mode: AccessMode
): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  if (!isActive(access)) return false;
  const role = access!.role;
  if (mode === "read") {
    return ["owner", "manager", "finance", "operations", "viewer"].includes(role);
  }
  // write
  if (category === "financial") return ["owner", "finance"].includes(role);
  if (category === "operational") return ["owner", "manager", "operations"].includes(role);
  return ["owner", "manager"].includes(role);
}

export async function canManageListings(
  userId: string,
  businessId: string,
  mode: AccessMode
): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  if (!isActive(access)) return false;
  const role = access!.role;
  if (mode === "read") {
    return ["owner", "manager", "finance", "operations", "viewer"].includes(role);
  }
  return ["owner", "manager"].includes(role);
}

export async function canManageTeam(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  if (!isActive(access)) return false;
  return access!.role === "owner";
}

export async function canManageBilling(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  if (!isActive(access)) return false;
  return access!.role === "owner";
}
