import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Platform Admin Security Foundation", () => {
  it("fixes contact subject persistence and support profile email query mismatch", () => {
    const contactRoute = read("app/api/contact/route.ts");
    const commandCenterMigration = read("supabase/migrations/20260804143000_admin_support_contact_command_center.sql");
    const supportPage = read("app/[locale]/support/page.tsx");

    expect(contactRoute).toContain("subject:");
    expect(commandCenterMigration).toContain("ADD COLUMN IF NOT EXISTS subject text");
    expect(supportPage).toContain('.select("full_name")');
    expect(supportPage).not.toContain("full_name, email");
  });

  it("enforces sole active platform owner and owner guardrails at DB level", () => {
    const migration = read("supabase/migrations/20260804160000_platform_admin_security_foundation.sql");

    expect(migration).toContain("platform_admins_single_active_owner_idx");
    expect(migration).toContain("admin_role = 'platform_owner'");
    expect(migration).toContain("cannot delete active platform owner");
    expect(migration).toContain("cannot deactivate, demote, or replace the active platform owner");
    expect(migration).toContain("cannot create or promote another active platform owner");
    expect(migration).toContain("exactly one active platform_owner is required");
  });

  it("adds append-only platform admin audit table with strict RLS", () => {
    const migration = read("supabase/migrations/20260804160000_platform_admin_security_foundation.sql");

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.platform_admin_audit_events");
    expect(migration).toContain("platform_admin_audit_events is append-only");
    expect(migration).toContain("ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("ALTER TABLE public.platform_admin_audit_events ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("REVOKE ALL ON TABLE public.platform_admins FROM anon, authenticated");
    expect(migration).toContain("REVOKE ALL ON TABLE public.platform_admin_audit_events FROM anon, authenticated");
  });

  it("adds secure admin authorization RPCs and uses server-only admin access helpers", () => {
    const migration = read("supabase/migrations/20260804160000_platform_admin_security_foundation.sql");
    const accessHelper = read("lib/admin/access.ts");

    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_platform_admin_access()");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.is_platform_admin");
    expect(accessHelper).toContain('import "server-only"');
    expect(accessHelper).toContain('supabase.rpc("get_platform_admin_access")');
    expect(accessHelper).toContain("getAuthenticatorAssuranceLevel");
    expect(accessHelper).toContain("currentAal !== \"aal2\"");
  });

  it("includes bilingual MFA enrollment/challenge flow and admin route handling", () => {
    const adminRoute = read("app/[locale]/admin/page.tsx");
    const accessDeniedRoute = read("app/[locale]/admin/access/page.tsx");
    const mfaRoute = read("app/[locale]/admin/mfa/page.tsx");
    const mfaClient = read("components/admin/AdminMfaClient.tsx");
    const en = read("messages/en.json");
    const es = read("messages/es.json");

    expect(adminRoute).toContain("requirePlatformAdmin");
    expect(accessDeniedRoute).toContain("reason");
    expect(mfaRoute).toContain("AdminMfaClient");
    expect(mfaClient).toContain("mfa.enroll");
    expect(mfaClient).toContain("mfa.challengeAndVerify");
    expect(en).toContain('"AdminSecurity"');
    expect(es).toContain('"AdminSecurity"');
  });

  it("shows admin navigation only after verified server-side authorization", () => {
    const navbarServer = read("components/Navbar.tsx");
    const navbarClient = read("components/NavbarClient.tsx");

    expect(navbarServer).toContain("canAccessAdminConsole");
    expect(navbarClient).toContain("showAdminConsole");
    expect(navbarClient).toContain('href="/admin"');
  });

  it("contains no hardcoded admin identity secrets and no owner-promotion UI or server action", () => {
    const accessHelper = read("lib/admin/access.ts");
    const adminActions = read("app/[locale]/admin/support/actions.ts") + read("app/[locale]/admin/contact/actions.ts");

    expect(accessHelper).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    expect(accessHelper).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
    expect(adminActions).not.toContain("platform_owner");
    expect(adminActions).not.toContain("admin_role");
  });
});
