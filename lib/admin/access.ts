import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSafeRedirect } from "@/lib/auth/safe-redirect";

export type PlatformAdminRole = "platform_owner" | "support_admin" | "moderator" | "read_only";

export type PlatformAdminPermissions = {
  canView: boolean;
  canAssign: boolean;
  canChangeStatus: boolean;
  canChangePriority: boolean;
  canReplyPublic: boolean;
  canWriteInternalNotes: boolean;
  canArchive: boolean;
  canConvertContact: boolean;
};

const ROLE_PERMISSIONS: Record<PlatformAdminRole, PlatformAdminPermissions> = {
  platform_owner: {
    canView: true,
    canAssign: true,
    canChangeStatus: true,
    canChangePriority: true,
    canReplyPublic: true,
    canWriteInternalNotes: true,
    canArchive: true,
    canConvertContact: true,
  },
  support_admin: {
    canView: true,
    canAssign: true,
    canChangeStatus: true,
    canChangePriority: true,
    canReplyPublic: true,
    canWriteInternalNotes: true,
    canArchive: true,
    canConvertContact: true,
  },
  moderator: {
    canView: true,
    canAssign: false,
    canChangeStatus: true,
    canChangePriority: false,
    canReplyPublic: true,
    canWriteInternalNotes: true,
    canArchive: false,
    canConvertContact: false,
  },
  read_only: {
    canView: true,
    canAssign: false,
    canChangeStatus: false,
    canChangePriority: false,
    canReplyPublic: false,
    canWriteInternalNotes: false,
    canArchive: false,
    canConvertContact: false,
  },
};

type PlatformAdminRpcAccess = {
  authenticated: boolean;
  is_admin: boolean;
  active: boolean;
  admin_role: string | null;
  aal: string;
  next_aal: string;
  is_aal2: boolean;
};

export type PlatformAdminContext = {
  userId: string;
  role: PlatformAdminRole;
  permissions: PlatformAdminPermissions;
  aal: "aal1" | "aal2";
  nextAal: "aal1" | "aal2";
};

export type AdminAccessReason = "unauthorized" | "inactive" | "forbidden" | "aal1";

function localePrefix(locale: string): string {
  return locale === "es" ? "/es" : "";
}

function normalizeAal(value: string | null | undefined): "aal1" | "aal2" {
  return value === "aal2" ? "aal2" : "aal1";
}

function isPlatformAdminRole(value: string | null): value is PlatformAdminRole {
  return value === "platform_owner" || value === "support_admin" || value === "moderator" || value === "read_only";
}

async function readRpcAccess(supabase: Awaited<ReturnType<typeof createClient>>): Promise<PlatformAdminRpcAccess> {
  const { data } = await supabase.rpc("get_platform_admin_access");
  const raw = (data ?? {}) as Partial<PlatformAdminRpcAccess>;

  return {
    authenticated: Boolean(raw.authenticated),
    is_admin: Boolean(raw.is_admin),
    active: Boolean(raw.active),
    admin_role: typeof raw.admin_role === "string" ? raw.admin_role : null,
    aal: normalizeAal(raw.aal),
    next_aal: normalizeAal(raw.next_aal),
    is_aal2: Boolean(raw.is_aal2),
  };
}

export async function getPlatformAdminContext(userId: string): Promise<PlatformAdminContext | null> {
  const supabase = await createClient();

  const [rpcAccess, aalResult] = await Promise.all([
    readRpcAccess(supabase),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  if (!rpcAccess.authenticated || !rpcAccess.is_admin || !rpcAccess.active || !isPlatformAdminRole(rpcAccess.admin_role)) {
    return null;
  }

  const currentAal = normalizeAal(aalResult.data?.currentLevel ?? rpcAccess.aal);
  const nextAal = normalizeAal(aalResult.data?.nextLevel ?? rpcAccess.next_aal);

  if (userId !== (await supabase.auth.getUser()).data.user?.id) {
    return null;
  }

  return {
    userId,
    role: rpcAccess.admin_role,
    permissions: ROLE_PERMISSIONS[rpcAccess.admin_role],
    aal: currentAal,
    nextAal,
  };
}

export async function canAccessAdminConsole(): Promise<boolean> {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    rpcAccess,
    aalResult,
  ] = await Promise.all([
    supabase.auth.getUser(),
    readRpcAccess(supabase),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  if (!user || !rpcAccess.authenticated || !rpcAccess.is_admin || !rpcAccess.active) {
    return false;
  }

  if (!isPlatformAdminRole(rpcAccess.admin_role)) {
    return false;
  }

  const currentAal = normalizeAal(aalResult.data?.currentLevel ?? rpcAccess.aal);
  return currentAal === "aal2";
}

export function getRolePermissions(role: PlatformAdminRole): PlatformAdminPermissions {
  return ROLE_PERMISSIONS[role];
}

export async function requirePlatformAdmin(
  permission?: keyof PlatformAdminPermissions,
  options?: { locale?: string; nextPath?: string }
): Promise<PlatformAdminContext> {
  const locale = options?.locale === "es" ? "es" : "en";
  const prefix = localePrefix(locale);
  const defaultNext = `${prefix}/admin`;
  const safeNext = getSafeRedirect(options?.nextPath ?? defaultNext);

  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    rpcAccess,
    aalResult,
  ] = await Promise.all([
    supabase.auth.getUser(),
    readRpcAccess(supabase),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  if (!user || !rpcAccess.authenticated) {
    redirect(`${prefix}/login?next=${encodeURIComponent(safeNext)}`);
  }

  if (!rpcAccess.is_admin || !isPlatformAdminRole(rpcAccess.admin_role)) {
    redirect(`${prefix}/admin/access?reason=unauthorized`);
  }

  if (!rpcAccess.active) {
    redirect(`${prefix}/admin/access?reason=inactive`);
  }

  const currentAal = normalizeAal(aalResult.data?.currentLevel ?? rpcAccess.aal);
  const nextAal = normalizeAal(aalResult.data?.nextLevel ?? rpcAccess.next_aal);

  if (currentAal !== "aal2") {
    redirect(`${prefix}/admin/mfa?next=${encodeURIComponent(safeNext)}&reason=aal1`);
  }

  const context: PlatformAdminContext = {
    userId: user.id,
    role: rpcAccess.admin_role,
    permissions: ROLE_PERMISSIONS[rpcAccess.admin_role],
    aal: currentAal,
    nextAal,
  };

  if (permission && !context.permissions[permission]) {
    redirect(`${prefix}/admin/access?reason=forbidden`);
  }

  return context;
}
