import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260802012000_task_pairwise_ranking.sql"
);

function readMigration() {
  return fs.readFileSync(migrationPath, "utf8");
}

describe("task pairwise ranking migration", () => {
  it("adds the new task pairwise columns", () => {
    const migration = readMigration();

    expect(migration).toContain("ADD COLUMN IF NOT EXISTS pairwise_rating integer NOT NULL DEFAULT 1000");
    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS pairwise_comparison_count integer NOT NULL DEFAULT 0"
    );
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS pairwise_win_count integer NOT NULL DEFAULT 0");
  });

  it("creates the comparison history table with ownership data", () => {
    const migration = readMigration();

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.task_pairwise_comparisons");
    expect(migration).toContain("user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE");
    expect(migration).toContain("winner_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE");
    expect(migration).toContain("loser_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE");
  });

  it("enables row level security and ownership policies", () => {
    const migration = readMigration();

    expect(migration).toContain("ALTER TABLE public.task_pairwise_comparisons ENABLE ROW LEVEL SECURITY;");
    expect(migration).toContain('CREATE POLICY "Users can view own task pairwise comparisons"');
    expect(migration).toContain('CREATE POLICY "Users can insert own task pairwise comparisons"');
    expect(migration).toContain("auth.uid() = user_id");
  });

  it("defines the atomic database function with authenticated ownership checks", () => {
    const migration = readMigration();

    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.record_task_pairwise_choice");
    expect(migration).toContain("v_user_id uuid := auth.uid();");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("pairwise_comparison_count = pairwise_comparison_count + 1");
    expect(migration).toContain("pairwise_win_count = pairwise_win_count + 1");
    expect(migration).toContain("INSERT INTO public.task_pairwise_comparisons");
    expect(migration).toContain("SET search_path = public, pg_temp");
  });

  it("grants authenticated access without anonymous grants", () => {
    const migration = readMigration();

    expect(migration).toContain("GRANT SELECT, INSERT ON public.task_pairwise_comparisons TO authenticated;");
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.record_task_pairwise_choice(uuid, uuid) TO authenticated;"
    );
    expect(migration).toContain("GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_pairwise_comparisons TO service_role;");
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.record_task_pairwise_choice(uuid, uuid) TO service_role;"
    );
    expect(migration).not.toMatch(/GRANT\\s+.+\\s+TO\\s+anon/i);
  });
});
