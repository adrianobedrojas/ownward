import {
  ensureGeneratedResource,
  reverseBusinessInABoxRefund,
} from "@/app/api/webhooks/stripe/route";
import { getBusinessInABoxTemplate } from "@/lib/commerce/business-in-a-box-templates";

function makeTemplateItem(key: string, title: string, description?: string) {
  return {
    key,
    title: { en: title, es: title },
    description: description ? { en: description, es: description } : undefined,
  };
}

type Row = Record<string, unknown>;

type Filter = { column: string; value: unknown; op: "eq" | "is" | "neq" };

class MockSupabaseAdmin {
  public tables: Record<string, Row[]> = {
    tasks: [],
    business_milestones: [],
    growth_goals: [],
    sale_readiness_evidence: [],
    business_in_a_box_generated_resources: [],
    business_in_a_box_setups: [],
  };

  public failpoints = new Map<string, number>();
  private counters: Record<string, number> = {};

  setFailpoint(op: string, table: string, hits = 1) {
    this.failpoints.set(`${op}:${table}`, hits);
  }

  private shouldFail(op: string, table: string) {
    const key = `${op}:${table}`;
    const current = this.failpoints.get(key) ?? 0;
    if (current <= 0) {
      return null;
    }
    this.failpoints.set(key, current - 1);
    return { message: `forced failure on ${key}` };
  }

  private nextId(table: string) {
    this.counters[table] = (this.counters[table] ?? 0) + 1;
    return `${table}_${this.counters[table]}`;
  }

  private applyFilters(rows: Row[], filters: Filter[]) {
    return filters.reduce((currentRows, filter) => {
      if (filter.op === "eq") {
        return currentRows.filter((row) => row[filter.column] === filter.value);
      }
      if (filter.op === "neq") {
        return currentRows.filter((row) => row[filter.column] !== filter.value);
      }
      return currentRows.filter((row) => row[filter.column] === filter.value);
    }, rows);
  }

  private selectBuilder(table: string, filters: Filter[]) {
    return {
      eq: (column: string, value: unknown) => this.selectBuilder(table, [...filters, { column, value, op: "eq" }]),
      is: (column: string, value: unknown) => this.selectBuilder(table, [...filters, { column, value, op: "is" }]),
      maybeSingle: async () => {
        const rows = this.applyFilters(this.tables[table] ?? [], filters);
        return { data: rows[0] ?? null, error: null };
      },
      single: async () => {
        const rows = this.applyFilters(this.tables[table] ?? [], filters);
        return { data: rows[0] ?? null, error: rows[0] ? null : { message: "No rows" } };
      },
    };
  }

  from(table: string) {
    return {
      select: (_columns?: string) => this.selectBuilder(table, []),
      insert: (payload: Row | Row[]) => {
        const error = this.shouldFail("insert", table);
        const entries = Array.isArray(payload) ? payload : [payload];
        if (error) {
          return {
            select: () => ({
              single: async () => ({ data: null, error }),
              maybeSingle: async () => ({ data: null, error }),
            }),
          };
        }

        const inserted = entries.map((item) => {
          const row = { ...item };
          if (!row.id) {
            row.id = this.nextId(table);
          }
          if (!row.created_at) {
            row.created_at = new Date().toISOString();
          }
          if (!row.updated_at) {
            row.updated_at = row.created_at;
          }
          if (table === "tasks" || table === "business_milestones" || table === "growth_goals" || table === "sale_readiness_evidence") {
            const duplicate = (this.tables[table] ?? []).find(
              (existing) => existing.generated_template_item_key === row.generated_template_item_key
            );
            if (duplicate) {
              return { duplicate: true, row: duplicate } as unknown as Row;
            }
          }
          (this.tables[table] ??= []).push(row);
          return row;
        });

        const duplicateRow = inserted.find((item) => item && (item as Row).duplicate === true) as Row | undefined;
        if (duplicateRow) {
          return {
            select: () => ({
              single: async () => ({ data: null, error: { code: "23505", message: "duplicate key" } }),
              maybeSingle: async () => ({ data: null, error: { code: "23505", message: "duplicate key" } }),
            }),
          };
        }

        return {
          select: () => ({
            single: async () => ({ data: inserted[0] ?? null, error: null }),
            maybeSingle: async () => ({ data: inserted[0] ?? null, error: null }),
          }),
        };
      },
      upsert: (payload: Row, opts?: { onConflict?: string }) => {
        const error = this.shouldFail("upsert", table);
        if (error) {
          return { error };
        }

        const row = { ...payload };
        if (!row.id) {
          row.id = this.nextId(table);
        }
        const conflictColumns = (opts?.onConflict ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        const rows = this.tables[table] ?? [];
        const existing = conflictColumns.length
          ? rows.find((candidate) => conflictColumns.every((column) => candidate[column] === row[column]))
          : undefined;
        if (existing) {
          Object.assign(existing, row);
        } else {
          rows.push(row);
          this.tables[table] = rows;
        }
        return { error: null, data: row };
      },
      update: (patch: Row) => {
        const tableFilters: Filter[] = [];
        const mutate = () => {
          const error = this.shouldFail("update", table);
          if (error) {
            return { data: null, error };
          }
          const rows = this.applyFilters(this.tables[table] ?? [], tableFilters);
          for (const row of rows) {
            Object.assign(row, patch);
          }
          return { data: rows, error: null };
        };
        const builder = {
          eq: (column: string, value: unknown) => {
            tableFilters.push({ column, value, op: "eq" });
            return builder;
          },
          neq: (column: string, value: unknown) => {
            tableFilters.push({ column, value, op: "neq" });
            return builder;
          },
          is: (column: string, value: unknown) => {
            tableFilters.push({ column, value, op: "is" });
            return builder;
          },
          then: (resolve: (value: { data: Row[] | null; error: { message: string } | null }) => void) => {
            resolve(mutate());
          },
        };
        return builder;
      },
      delete: () => {
        const tableFilters: Filter[] = [];
        const mutate = () => {
          const error = this.shouldFail("delete", table);
          if (error) {
            return { data: null, error };
          }
          const rows = this.tables[table] ?? [];
          const keep = rows.filter((row) => !this.applyFilters([row], tableFilters).length);
          this.tables[table] = keep;
          return { data: null, error: null };
        };
        const builder = {
          eq: (column: string, value: unknown) => {
            tableFilters.push({ column, value, op: "eq" });
            return builder;
          },
          is: (column: string, value: unknown) => {
            tableFilters.push({ column, value, op: "is" });
            return builder;
          },
          then: (resolve: (value: { data: null; error: { message: string } | null }) => void) => {
            resolve(mutate());
          },
        };
        return builder;
      },
    };
  }
}

describe("Business-in-a-Box webhook helpers", () => {
  const template = getBusinessInABoxTemplate("remote_consulting")!;
  const userId = "00000000-0000-4000-8000-000000000001";
  const businessId = "11111111-1111-4111-8111-111111111111";
  const purchaseId = "purchase_1";
  const setupId = "setup_1";
  const now = "2026-08-05T00:00:00.000Z";

  function seedSetup(db: MockSupabaseAdmin) {
    db.tables.business_in_a_box_setups.push({
      id: setupId,
      purchase_id: purchaseId,
      status: "processing",
      business_id: businessId,
    });
  }

  it("creates each generated source row once and links provenance on retry after provenance failure", async () => {
    const db = new MockSupabaseAdmin();
    const templateItem = template.starterTasks[0] ?? makeTemplateItem("starter_task", "Initial call prep");
    db.setFailpoint("upsert", "business_in_a_box_generated_resources", 1);

    await expect(
      ensureGeneratedResource({
        setupId,
        purchaseId,
        userId,
        businessId,
        template,
        resourceType: "starter_task",
        templateItem,
        now,
        supabaseAdmin: db as unknown as Parameters<typeof ensureGeneratedResource>[0]["supabaseAdmin"],
      })
    ).rejects.toThrow(/Failed to upsert generated resource/);

    expect(db.tables.tasks).toHaveLength(1);
    expect(db.tables.business_in_a_box_generated_resources).toHaveLength(0);

    await ensureGeneratedResource({
      setupId,
      purchaseId,
      userId,
      businessId,
      template,
      resourceType: "starter_task",
      templateItem,
      now,
      supabaseAdmin: db as unknown as Parameters<typeof ensureGeneratedResource>[0]["supabaseAdmin"],
    });

    expect(db.tables.tasks).toHaveLength(1);
    expect(db.tables.business_in_a_box_generated_resources).toHaveLength(1);
  });

  it("does not create duplicate source resources for the same template item", async () => {
    const db = new MockSupabaseAdmin();
    const templateItem = template.starterTasks[0] ?? makeTemplateItem("starter_task", "Initial call prep");

    await ensureGeneratedResource({
      setupId,
      purchaseId,
      userId,
      businessId,
      template,
      resourceType: "starter_task",
      templateItem,
      now,
      supabaseAdmin: db as unknown as Parameters<typeof ensureGeneratedResource>[0]["supabaseAdmin"],
    });
    await ensureGeneratedResource({
      setupId,
      purchaseId,
      userId,
      businessId,
      template,
      resourceType: "starter_task",
      templateItem,
      now,
      supabaseAdmin: db as unknown as Parameters<typeof ensureGeneratedResource>[0]["supabaseAdmin"],
    });

    expect(db.tables.tasks).toHaveLength(1);
    expect(db.tables.business_in_a_box_generated_resources).toHaveLength(1);
  });

});
