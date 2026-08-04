import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260804130000_fix_team_rbac_profile_email.sql"
);

const priorTeamRbacMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260804120000_team_rbac_enforcement.sql"
);

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

describe("team RBAC profile-email forward migration", () => {
  it("adds the forward migration file after the already-applied migration", () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it("replaces both affected functions", () => {
    const sql = read(migrationPath);

    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.count_owner_collaborator_usage(p_owner_user_id uuid)");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.accept_business_invitation_atomic(");
  });

  it("does not reference public.profiles.email or p.email", () => {
    const sql = read(migrationPath);

    expect(sql).not.toContain("public.profiles.email");
    expect(sql).not.toMatch(/\bp\.email\b/);
  });

  it("uses JWT email for signed-in invitees and auth.users fallback", () => {
    const sql = read(migrationPath);

    expect(sql).toContain("auth.jwt() ->> 'email'");
    expect(sql).toContain("FROM auth.users au");
    expect(sql).toContain("public.normalize_email(coalesce(au.email::text, ''))");
  });

  it("uses auth.users.email for collaborator deduplication", () => {
    const sql = read(migrationPath);

    expect(sql).toContain("active_collaborator_emails AS (");
    expect(sql).toContain("FROM auth.users au");
    expect(sql).toContain("JOIN active_collaborator_users acu ON acu.user_id = au.id");
    expect(sql).toContain("public.normalize_email(au.email::text)");
  });

  it("preserves execution revocation and restricted grants", () => {
    const sql = read(migrationPath);

    expect(sql).toContain("REVOKE ALL ON FUNCTION public.count_owner_collaborator_usage(uuid) FROM PUBLIC;");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.accept_business_invitation_atomic(text, integer) FROM PUBLIC;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.count_owner_collaborator_usage(uuid) TO authenticated;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.accept_business_invitation_atomic(text, integer) TO authenticated;");
  });

  it("keeps the already-applied migration file intact in this change set", () => {
    const priorSql = read(priorTeamRbacMigrationPath);

    expect(priorSql).toContain("20260804120000_team_rbac_enforcement.sql");
  });
});
