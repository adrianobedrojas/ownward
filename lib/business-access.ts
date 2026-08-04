/**
 * Centralized business authorization helpers.
 *
 * Never trust a role sent from the browser. Always look up the role
 * server-side from business_members using the authenticated user's ID.
 */

import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BusinessRole = "owner" | "manager" | "finance" | "operations" | "viewer";
export type MemberStatus = "active" | "suspended" | "removed";
export type DocumentCategory = "financial" | "operational" | "general";

export interface BusinessAccess {
  role: BusinessRole;
  status: MemberStatus;
  memberId: string | null;
}

const ALL_ROLES: readonly BusinessRole[] = [
  "owner",
  "manager",
  "finance",
  "operations",
  "viewer",
];

const ACTIVE_WRITE_ROLES = {
  businessEdit: ["owner", "manager"] as const,
  crmWrite: ["owner", "manager", "operations"] as const,
  operationsWrite: ["owner", "manager", "operations"] as const,
  financeWrite: ["owner", "manager", "finance"] as const,
  listingsWrite: ["owner", "manager", "operations"] as const,
  dealRoomWrite: ["owner", "manager", "operations"] as const,
};

// ─── Core lookup ──────────────────────────────────────────────────────────────

/**
 * Returns the authenticated user's access record for a given business,
 * or null if they have no access (not a member, not the owner, suspended, etc.).
 */
export async function getBusinessAccess(
  userId: string,
  businessId: string
): Promise<BusinessAccess | null> {
  if (!userId || !businessId) return null;

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

  if (!ALL_ROLES.includes(member.role as BusinessRole)) {
    return null;
  }

  if (!["active", "suspended", "removed"].includes(member.status)) {
    return null;
  }

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

function hasRole(
  access: BusinessAccess | null,
  roles: readonly BusinessRole[]
): boolean {
  return isActive(access) && roles.includes(access!.role);
}

// ─── Permission helpers ───────────────────────────────────────────────────────

export async function canViewBusiness(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  return isActive(access);
}

export async function canEditBusiness(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  return hasRole(access, ACTIVE_WRITE_ROLES.businessEdit);
}

export async function canReadCRM(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  return hasRole(access, ALL_ROLES);
}

export async function canWriteCRM(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  return hasRole(access, ACTIVE_WRITE_ROLES.crmWrite);
}

export async function canReadOperations(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  return hasRole(access, ALL_ROLES);
}

export async function canWriteOperations(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  return hasRole(access, ACTIVE_WRITE_ROLES.operationsWrite);
}

export async function canReadFinance(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  if (!isActive(access)) return false;
  return ["owner", "manager", "finance", "viewer"].includes(access!.role);
}

export async function canWriteFinance(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  return hasRole(access, ACTIVE_WRITE_ROLES.financeWrite);
}

export async function canReadDocuments(
  userId: string,
  businessId: string,
  category: DocumentCategory
): Promise<boolean> {
  void category;
  const access = await getBusinessAccess(userId, businessId);
  return hasRole(access, ALL_ROLES);
}

export async function canWriteDocuments(
  userId: string,
  businessId: string,
  category: DocumentCategory
): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  if (!isActive(access)) return false;
  if (category === "financial") {
    return ["owner", "manager", "finance"].includes(access!.role);
  }
  if (category === "operational") {
    return ["owner", "manager", "operations"].includes(access!.role);
  }
  return ["owner", "manager"].includes(access!.role);
}

export async function canReadListings(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  return hasRole(access, ALL_ROLES);
}

export async function canWriteListings(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  return hasRole(access, ACTIVE_WRITE_ROLES.listingsWrite);
}

export async function canReadDealRoom(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  return hasRole(access, ALL_ROLES);
}

export async function canWriteDealRoom(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  return hasRole(access, ACTIVE_WRITE_ROLES.dealRoomWrite);
}

export async function canManageTeam(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  return hasRole(access, ["owner"]);
}

export async function canManageBilling(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  return hasRole(access, ["owner"]);
}

export async function canDeleteBusiness(userId: string, businessId: string): Promise<boolean> {
  const access = await getBusinessAccess(userId, businessId);
  return hasRole(access, ["owner"]);
}

// Backward-compatible wrappers for existing callsites/tests.
export async function canAccessCRM(
  userId: string,
  businessId: string,
  mode: "read" | "write"
): Promise<boolean> {
  return mode === "read"
    ? canReadCRM(userId, businessId)
    : canWriteCRM(userId, businessId);
}

export async function canAccessOperations(
  userId: string,
  businessId: string,
  mode: "read" | "write"
): Promise<boolean> {
  return mode === "read"
    ? canReadOperations(userId, businessId)
    : canWriteOperations(userId, businessId);
}

export async function canAccessFinance(
  userId: string,
  businessId: string,
  mode: "read" | "write"
): Promise<boolean> {
  return mode === "read"
    ? canReadFinance(userId, businessId)
    : canWriteFinance(userId, businessId);
}

export async function canAccessDocuments(
  userId: string,
  businessId: string,
  category: DocumentCategory,
  mode: "read" | "write"
): Promise<boolean> {
  return mode === "read"
    ? canReadDocuments(userId, businessId, category)
    : canWriteDocuments(userId, businessId, category);
}

export async function canManageListings(
  userId: string,
  businessId: string,
  mode: "read" | "write"
): Promise<boolean> {
  return mode === "read"
    ? canReadListings(userId, businessId)
    : canWriteListings(userId, businessId);
}
