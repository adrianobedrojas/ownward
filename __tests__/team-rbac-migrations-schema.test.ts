import fs from "fs";
import path from "path";

const teamRbacPath = path.join(
  process.cwd(),
  "supabase/migrations/20260804010000_team_collaboration_rbac.sql"
);

const teamEnforcementPath = path.join(
  process.cwd(),
  "supabase/migrations/20260804120000_team_rbac_enforcement.sql"
);

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function section(sql: string, startMarker: string, endMarker: string) {
  const start = sql.indexOf(startMarker);
  const end = sql.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) return "";
  return sql.slice(start, end);
}

describe("team RBAC pending migrations schema safety", () => {
  it("does not reference business_listings.business_id in listing policies", () => {
    const migrationA = read(teamRbacPath);
    const migrationB = read(teamEnforcementPath);

    const listingBlockA = section(
      migrationA,
      "-- 11. Marketplace listings",
      "-- 12. Deal rooms"
    );

    const listingBlockB = section(
      migrationB,
      "DO $$\nDECLARE\n  v_has_user_id boolean;",
      "END;\n$$;"
    );

    expect(listingBlockB).not.toBe("");
    expect(listingBlockA).not.toContain("business_id IS NOT NULL");
    expect(listingBlockA).not.toContain("public.has_business_access(auth.uid(), business_id)");
    expect(listingBlockB).not.toContain("business_id IS NOT NULL");
    expect(listingBlockB).not.toContain("public.has_business_access(auth.uid(), business_id)");
  });

  it("keeps owner read and published public listing read for authenticated users", () => {
    const migrationA = read(teamRbacPath);
    const migrationB = read(teamEnforcementPath);

    expect(migrationA).toContain("CREATE POLICY \"Owner and public read listings\"");
    expect(migrationA).toContain("user_id = auth.uid()");
    expect(migrationA).toContain("is_public = true");
    expect(migrationA).toContain("status = 'published'");

    expect(migrationB).toContain("CREATE POLICY \"listing_owner_select\"");
    expect(migrationB).toContain("user_id = auth.uid()");
    expect(migrationB).toContain("is_public = true");
    expect(migrationB).toContain("status = 'published'");
  });

  it("does not expose private listings via broad authenticated reads", () => {
    const migrationA = read(teamRbacPath);
    const migrationB = read(teamEnforcementPath);

    expect(migrationA).not.toMatch(/ON public\.business_listings[\s\S]*OR\s+status\s*=\s*'published'/);
    expect(migrationB).not.toMatch(/ON public\.business_listings[\s\S]*USING\s*\(\s*true\s*\)/);
  });

  it("uses schema-safe deal_room policy construction without owner_user_id dependency", () => {
    const migrationA = read(teamRbacPath);

    const dealRoomBlock = section(
      migrationA,
      "-- 12. Deal rooms",
      "-- END OF MIGRATION"
    );

    expect(dealRoomBlock).toContain("DECLARE");
    expect(dealRoomBlock).toContain("v_has_seller_id");
    expect(dealRoomBlock).toContain("v_has_buyer_id");
    expect(dealRoomBlock).toContain("v_has_business_id");
    expect(dealRoomBlock).not.toContain("owner_user_id = auth.uid()");
  });

  it("references key schema columns that exist in repository migrations", () => {
    const migrationA = read(teamRbacPath);
    const migrationB = read(teamEnforcementPath);

    expect(migrationA).toContain("owner_id");
    expect(migrationA).toContain("user_id");
    expect(migrationA).toContain("status");

    expect(migrationB).toContain("owner_id");
    expect(migrationB).toContain("user_id");
    expect(migrationB).toContain("status");
    expect(migrationB).toContain("is_public");
  });
});
