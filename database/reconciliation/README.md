# Database Reconciliation — 2026-08-01

This directory documents the reconciliation performed to align the local Supabase
migration chain with the live production state recorded on 2026-08-01.

---

## 1. Live Production Snapshot

File: `20260801_remote_public_schema_before_reconciliation.sql`

This is a verbatim copy of `database/schema.sql`, the public schema dump taken
from production before any reconciliation work began.  It captures 11 live tables,
their columns, constraints, indexes, foreign keys, RLS settings, and policies
**exactly as they existed in production**.

---

## 2. Remote-Applied Migration Version

Production's `supabase_migrations.schema_migrations` table contained exactly
**one** entry:

```
20260729031201
```

The file that was applied under that version (`20260729031201_fix_documents_table.sql`)
renamed columns in `public.documents` and consolidated its RLS policies.
Those changes are already reflected in the production snapshot.

---

## 3. Migration Filename Mapping

### Moved to legacy (no longer active)

| Old path | New path |
|---|---|
| `supabase/migrations/20260729031201_fix_documents_table.sql` | `database/reconciliation/legacy-migrations/20260729031201_fix_documents_table.sql` |

### Created (replaces legacy in the active migration chain)

| New file | Purpose |
|---|---|
| `supabase/migrations/20260729031201_remote_public_baseline.sql` | Recreates the full production public schema from scratch on a fresh database |

### Renamed to resolve duplicate versions

| Old filename | New filename | Reason |
|---|---|---|
| `20260731090000_messaging_phase1.sql` | `20260731090100_messaging_phase1.sql` | Duplicate of `20260731090000_growth_and_valuation.sql` |
| `20260731100000_featured_listings.sql` | `20260731100100_featured_listings.sql` | Duplicate of `20260731100000_conversations_rls_fix.sql` |
| `20260731100000_valuation_reports.sql` | `20260731100200_valuation_reports.sql` | Duplicate of `20260731100000_conversations_rls_fix.sql` |

Renames were performed with `git mv` to preserve file history.

### Final migration order (unique versions)

```
20260729031201  remote_public_baseline
20260729052000  launch_readiness
20260731074000  social_auth_consent
20260731080000  create_tasks_table
20260731090000  growth_and_valuation
20260731090100  messaging_phase1
20260731100000  conversations_rls_fix
20260731100100  featured_listings
20260731100200  valuation_reports
20260731110000  deal_rooms
20260731120000  bookkeeping_foundation
20260731123000  security_foundation
20260731130000  starter_workspace
20260731140000  builder_workspace
20260731150000  pro_workspace
20260731160000  api_grants
```

---

## 4. Baseline Strategy

`supabase/migrations/20260729031201_remote_public_baseline.sql` recreates the
production public schema so that `supabase db reset` works on a fresh local
database.

Key decisions:
- Reuses version `20260729031201` so that production, which already recorded this
  version, will skip the file on a future `supabase db push`.
- Uses `documents` columns in their **post-rename state** (filename, storage_path,
  filesize, filetype, public_url) because that is the state already in production.
- Omits `OWNER TO` statements (environment-specific).
- Omits the `CREATE EVENT TRIGGER` for `rls_auto_enable` (Supabase-managed).
- Omits customer data.
- Omits broad default privileges (`REFERENCES, TRIGGER, TRUNCATE, MAINTAIN`);
  those are revoked by `20260731160000_api_grants.sql`.

---

## 5. Businesses `owner_id` Correction

The original `20260731130000_starter_workspace.sql` created two indexes on the
non-existent column `businesses.user_id`:

```sql
-- WRONG (before fix)
CREATE INDEX businesses_user_id_idx  ON public.businesses (user_id);
CREATE INDEX businesses_deleted_idx  ON public.businesses (user_id, deleted_at) WHERE deleted_at IS NULL;
```

The `public.businesses` table has always used `owner_id` as its ownership column
(confirmed in the production snapshot and all application code).  The indexes
were corrected to:

```sql
-- CORRECT (after fix)
CREATE INDEX businesses_owner_id_idx      ON public.businesses (owner_id);
CREATE INDEX businesses_owner_deleted_idx ON public.businesses (owner_id, deleted_at) WHERE deleted_at IS NULL;
```

The subsequent `20260731140000_builder_workspace.sql` already contained an
idempotent repair block (with `IF EXISTS` / `IF NOT EXISTS` guards) that handled
this mismatch at runtime.  That repair block was preserved and updated to also
drop the baseline's `"Owners can manage their businesses"` policy before creating
the canonical `"Users manage own businesses"` policy, avoiding a duplicate ALL
policy on `public.businesses`.

---

## 6. Storage Policy Reconciliation

`20260729052000_launch_readiness.sql` manages the private `vault` storage bucket.

**Problem:** Production may have vault policies created under different names than
the current migration expected, leaving orphaned policies that could conflict with
the idempotent recreate.

**Fix:** The migration was updated to `DROP POLICY IF EXISTS` for both the legacy
names (e.g. `vault: owner INSERT`, `Give users access to their own vault folder 1`)
**and** the current names before creating four clean policies:

| Operation | Policy name |
|---|---|
| INSERT | `Users can upload to own vault folder` |
| SELECT | `Users can view own vault files` |
| UPDATE | `Users can update own vault files` |
| DELETE | `Users can delete own vault files` |

All four policies scope access to `bucket_id = 'vault'` and
`(storage.foldername(name))[1] = auth.uid()::text`.

The `vault` bucket is upserted with `ON CONFLICT (id) DO UPDATE SET public = false`
to guarantee it remains private.

No `documents` bucket is created.

---

## 7. Grants Strategy

`supabase/migrations/20260731160000_api_grants.sql` implements least-privilege
table grants aligned with the RLS policies.

### Principles

1. **Revoke over-broad defaults** — The production schema's default privileges
   granted `REFERENCES, TRIGGER, TRUNCATE, MAINTAIN` to `anon` and `authenticated`.
   These are revoked on every public table.

2. **`anon`** — Only operations exposed to unauthenticated visitors:
   - `SELECT` on `business_listings`, `businesses`, `listings`, `posts` (public data)
   - `INSERT` on `business_visits`, `community_actions`, `community_pulse_responses`,
     `contact_messages` (public interactions, gated by RLS)
   - `USAGE` on identity sequences for the INSERT-only tables

3. **`authenticated`** — Every DML operation backed by an RLS policy.
   No operation is granted without a corresponding policy that enforces row-level
   isolation.  Notable restrictions:
   - `subscriptions`: `SELECT` only (Stripe webhooks write via service_role)
   - `listing_promotions`: `SELECT` only (ditto)
   - `stripe_events`: no grant (policy blocks all client access)

4. **`service_role`** — Full `SELECT, INSERT, UPDATE, DELETE` on all public tables
   required for Stripe webhooks, admin routes, and background jobs.  service_role
   bypasses RLS, so grants here control schema-level visibility only.

---

## 8. Commands That Must NOT Be Run Until Review

The following commands interact with the remote (production) Supabase project and
**must not be run** without explicit sign-off:

```bash
# DO NOT RUN — writes schema changes to production database
supabase db push
supabase db push --linked

# DO NOT RUN — overwrites local migration history with remote state
supabase db pull
supabase db pull --linked

# DO NOT RUN — marks migration versions as applied/reverted in production
supabase migration repair

# DO NOT RUN — executes arbitrary SQL against production
supabase db execute --linked
psql "$DATABASE_URL" -f ...
```

All testing in this reconciliation was performed against the **local Docker
Supabase environment only** (`supabase start` / `supabase db reset`).
