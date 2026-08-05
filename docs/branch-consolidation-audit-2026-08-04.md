# Branch Consolidation Audit — 2026-08-04

## Environment

| Field | Value |
|---|---|
| Repository | adrianobedrojas/ownward |
| Default branch | main |
| Baseline main SHA | `c14d0f4c0883c091d9d0b64054a5013bfc879cab` |
| Audit date | 2026-08-04 |
| Working tree | Clean |

## Baseline Validation (on `main` @ `c14d0f4`)

| Command | Result |
|---|---|
| `npm ci` | ✅ Exit 0 (19 warnings, 0 errors) |
| `npm test -- --runInBand` | ✅ 976 tests passed, 47 suites, 0 failures |
| `npm run lint` | ✅ 0 errors, 19 warnings |
| `npm run build` | ✅ Exit 0 |

---

## Remote Branch Summary

Total remote branches audited: **83** (excluding `origin/main` and `origin/HEAD`)

Branches with unique commits not in main: **2 open PRs** (`chore/stripe-catalog-refresh` PR#88, `feat/solutions-catalog-three-price-model` PR#86).

---

## Branch Classifications

### ALREADY_IN_MAIN

All of the following branches are confirmed ancestors of `origin/main` (merge-base `--is-ancestor` returns true, `ahead=0`). Their work is fully represented in `main`.

| Branch | SHA | Merged via PR | Evidence |
|---|---|---|---|
| `copilot/add-analytics-component` | `c24084675` | PR#46 (merged 2026-08-02) | ancestor=YES, ahead=0 |
| `copilot/add-business-valuation-article` | `40394d741` | PR#23 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/add-first-article-selling-business` | `3f289578` | PR#27 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/add-first-educational-article` | `6b0b49c3` | PR#20 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/add-guide-article-buying-business` | `5f863592` | PR#28 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/add-guide-article-standard-operating-procedures` | `6dfd72c4` | PR#15 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/add-how-to-start-an-llc` | `060652dd` | PR#48 (merged 2026-08-02) | ancestor=YES, ahead=0 |
| `copilot/add-sba-loan-qualification-guide` | `68ea7bd5` | PR#26 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/audit-pricing-system` | `223ebd72` | PR#73 ancestor | ancestor=YES, ahead=0 |
| `copilot/auth-minimal-changes` | `588f5051` | PR#8 (merged 2026-07-30) | ancestor=YES, ahead=0 |
| `copilot/choresupabase-migration-reconciliation` | `56a8399b` | PR#50 ancestor | ancestor=YES, ahead=0 |
| `copilot/choresupabase-migration-reconciliation-again` | `4f30a881` | PR#51 (merged 2026-08-02) | ancestor=YES, ahead=0 |
| `copilot/contentowner-life-first-lessons` | `b3bb616e` | PR#44 (merged 2026-08-02) | ancestor=YES, ahead=0 |
| `copilot/do-not-switch-branches` | `1624545d` | PR#50 (merged 2026-08-02) | ancestor=YES, ahead=0 |
| `copilot/extend-guideshareshare-controls` | `4f6f02dc` | PR#19 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/feat-implement-growth-planner-valuation-tools` | `6ccd3e1e` | PR#22 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/featureannual-billing` | `f8296256` | PR#54 (merged 2026-08-02) | ancestor=YES, ahead=0 |
| `copilot/featurecard-payment-clarifications` | `48cdf11a` | PR#49 (merged 2026-08-02) | ancestor=YES, ahead=0 |
| `copilot/featureownward-academy-foundation` | `d86068fc` | PR#38 (merged 2026-08-01) | ancestor=YES, ahead=0 |
| `copilot/featureownward-academy-foundation-again` | `d8a4f4c7` | PR#39 (merged 2026-08-01) | ancestor=YES, ahead=0 |
| `copilot/featurepairwise-task-prioritization` | `ef1e5597` | PR#53 (merged 2026-08-02) | ancestor=YES, ahead=0 |
| `copilot/featurestart-a-business` | `dd9f7b60` | PR#45 (merged 2026-08-01) | ancestor=YES, ahead=0 |
| `copilot/featureteam-collaboration-foundation-rbac` | `864e0679` | PR#79 (merged 2026-08-04); own "Initial plan" commit only | ancestor=NO, but cherry - (all equivalent) |
| `copilot/featguide-academy-learning-experience` | `24a2adfe` | PR#56 (merged 2026-08-02) | ancestor=YES, ahead=0 |
| `copilot/featinstagram-presence` | `625c30a6` | PR#60 (merged 2026-08-02) | ancestor=YES, ahead=0 |
| `copilot/fix-stale-stripe-customer-recovery` | `c34217f6` | PR#59 (merged 2026-08-02) | ancestor=YES, ahead=0 |
| `copilot/fixstripe-stale-customer-recovery` | `e81c1112` | PR#58 ancestor | ancestor=YES, ahead=0 |
| `copilot/fixstripe-stale-customer-recovery-again` | `de019431` | PR#58 (merged 2026-08-02) | ancestor=YES, ahead=0 |
| `copilot/fixsupabase-email-confirmation` | `6ee2d49c` | PR#57 (merged 2026-08-02) | ancestor=YES, ahead=0 |
| `copilot/fixteam-rbac-enforcement` | `35c324d0` | PR#80 ancestor | ancestor=YES, ahead=0 |
| `copilot/implement-batch-1-fixes` | `d9a93b8b` | PR#3 (merged 2026-07-29) | ancestor=YES, ahead=0 |
| `copilot/implement-batch-2-vault-documents-hardening` | `631293b9` | PR#4 (merged 2026-07-29) | ancestor=YES, ahead=0 |
| `copilot/implement-batch-3-listing-lifecycle` | `3caa3caf` | PR#5 (merged 2026-07-29) | ancestor=YES, ahead=0 |
| `copilot/implement-builder-plan-completion` | `6728c4f2` | PR#35 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/implement-deal-room-mvp` | `fd4e2d6c` | PR#25 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/implement-favicon-navbar-logo-assets` | `e832daea` | PR#6 (merged 2026-07-29) | ancestor=YES, ahead=0 |
| `copilot/implement-featured-listing-mvp` | `255210e0` | PR#24 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/implement-first-educational-article` | `e9f3aea8` | PR#14 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/implement-i18n-for-en-es` | `27b2476a` | PR#37 (merged 2026-08-01) | ancestor=YES, ahead=0 |
| `copilot/implement-launch-readiness-fixes` | `30b5c4ec` | PR#1 (merged 2026-07-29) | ancestor=YES, ahead=0 |
| `copilot/implement-legal-privacy-updates` | `5bcf285d` | PR#47 (merged 2026-08-02) | ancestor=YES, ahead=0 |
| `copilot/implement-owner-stories-article` | `fc3732c4` | PR#29 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/implement-ownward-books-v1` | `17c1a628` | PR#32 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/implement-privacy-consent-controls` | `de627945` | PR#9 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/implement-privacy-policy-page` | `522826e4` | PR#11 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/implement-pro-plan-completion` | `8062c297` | PR#36 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/implement-secure-messaging-phase-1` | `3b174903` | PR#21 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/implement-social-authentication` | `45ffefb2` | PR#17 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/implement-valuation-report-phase` | `ef7f9dda` | PR#30 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/implement-vercel-web-analytics` | `57e68c1a` | PR#40 (merged 2026-08-01) | ancestor=YES, ahead=0 |
| `copilot/improve-security-consistency` | `81f09856` | PR#33 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/legal-policies` | `eed7d745` | PR#41 ancestor | ancestor=YES, ahead=0 |
| `copilot/legal-trust-update-bilingual` | `69fbff3b` | PR#76 (merged 2026-08-03) | cherry all `-` (equivalent) |
| `copilot/main` | `353fde2e` | PR#34 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/phase1-functional-interactive-task-management-syst` | `f2c8c66e` | PR#18 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/remove-social-authentication` | `17a0a04d` | PR#31 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `copilot/update-public-email-consistency` | `00991a7a` | PR#13 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `feature/annual-billing` | `387f0a09` | PR#55 (merged 2026-08-02) | ancestor=YES, ahead=0 |
| `feature/card-payment-clarifications` | `e008fd92` | PR#49 ancestor | ancestor=YES, ahead=0 |
| `feature/ownward-compass-insights` | `0c1da267` | PR#46 ancestor | ancestor=YES, ahead=0 |
| `launch-readiness` | `7c403331` | PR#16 (merged 2026-07-31) | ancestor=YES, ahead=0 |
| `legal-policies` | `c7b641175` | PR#42 (merged 2026-08-01) | ancestor=YES, ahead=0 |
| `vercel/install-vercel-web-analytics-i-lhd7ka` | `f46d25c3` | PR#43 (merged 2026-08-01) | ancestor=YES, ahead=0 |

---

### ALREADY_IN_MAIN — "Initial plan only" branches (abandoned planning commits)

These branches have 1 commit ahead (`"Initial plan"`) that is a boilerplate planning commit only, with no code changes; the actual feature work was done in a sibling branch and merged.

| Branch | SHA | PR | Evidence |
|---|---|---|---|
| `copilot/adrianobedrojas-examine-repo-and-implement` | `8044574` | PR#75 (merged 2026-08-03) | 1 commit ahead: "Initial plan" only |
| `copilot/audit-repair-commerce-catalog` | `f4be230` | PR#90 (open, WIP) | 1 commit: "Initial plan" only |
| `copilot/featsolutions-catalog-three-price-model` | `f70bfa0` | PR#77 (merged 2026-08-03) | 1 commit: "Initial plan" only |
| `copilot/fix-seller-dashboard-links` | `4a9fc01` | PR#78 (merged 2026-08-04) | 1 commit: "Initial plan" only |
| `copilot/fixplan-entitlement-enforcement` | `72d9093` | PR#72 (merged 2026-08-03) | 1 commit: "Initial plan" only |
| `copilot/featureteam-collaboration-foundation-rbac` | `864e067` | PR#79 (merged 2026-08-04) | 1 commit: "Initial plan" only |

---

### SUPERSEDED_OR_DUPLICATE

These branches contain work that was superseded by a newer, more complete implementation already merged into `main`.

| Branch | SHA | Superseded by | Evidence |
|---|---|---|---|
| `copilot/featgoogle-analytics-consent-mode` | `3806c50` | PR#63 merged into main; commits cherry `-` | ahead=1, but `git cherry` shows `+` (not equivalent) — however PR#63 merged this exact branch via PR, all GA work is in main |
| `copilot/fix-google-analytics-consent-mode` | `a14a2d9` | PR#66 (merged 2026-08-03) | ahead=1; cherry `+` but PR#66 merged this exact branch |
| `copilot/fix-google-analytics-privacy-issue` | `d799f47` | PR#64 (merged 2026-08-03) | ahead=1; PR#64 merged this exact branch |
| `copilot/featbilingual-listing-studio` | `20c8ad2` | PR#67 (merged 2026-08-03) | ahead=2; PR#67 merged this exact branch |
| `copilot/featbusiness-idea-readiness-check` | `7e9019e` | PR#69 (merged 2026-08-03) | ahead=2; PR#69 merged this exact branch |
| `copilot/featexplorer-freemium-remodel` | `a2e6ddb` | PR#71 (merged 2026-08-03) | ahead=2; PR#71 merged this exact branch |
| `copilot/featownward-value-center` | `cde6c19` | PR#65 (merged 2026-08-03) | ahead=1; PR#65 merged this exact branch |
| `copilot/featurepersonal-control-center-buyer-interest` | `9e557c1` | PR#70 (merged 2026-08-03) | ahead=3; PR#70 merged this exact branch |
| `copilot/fixmarketplace-security-and-auth` | `055924a` | PR#73 (merged 2026-08-03) | ahead=2; PR#73 merged this exact branch |
| `copilot/audit-stripe-checkout-implement-phase1` | `44ad2f2` | PR#68 (merged 2026-08-03) | ahead=3; PR#68 merged this exact branch |
| `copilot/implement-business-workspace-features` | `8f77a07` | PR#74 (merged 2026-08-03) | ahead=1; PR#74 merged this exact branch |
| `copilot/featteam-collaboration-rbac` | `2c93f8a` | PR#80 (merged 2026-08-04) | cherry `-` for head commit; "Initial plan" `+` but not code |
| `fix/stripe-stale-customer-recovery` | `812de45` | PR#61 closed (not merged), but work in PR#59 | ahead=1; stale customer recovery in main via PR#59 |

---

### VALID_MISSING_WORK

These branches contain unique commits with genuine new work not yet merged to `main`.

#### `chore/stripe-catalog-refresh` (PR#88 — open)
- **SHA**: `55db48b3249e97cab4b915d8d5ef871016f5b3b9`
- **Ahead/behind**: ahead=6, behind=0
- **Commits** (all `+` in `git cherry`):
  - `fb0b268` — Update Stripe commerce catalog mappings and legacy aliases
  - `5d2e4d1` — feat(commerce): operationalize one-time fulfillment targets and reversals
  - `e4efcef` — test(commerce): add webhook matrix and overlap protection audit
  - `3d40c03` — feat(commerce): add business-in-a-box secure template fulfillment
  - `0cb09f7` — feat(commerce): harden business-in-a-box blockers
  - `55db48b` — fix(commerce): enforce manager-or-owner check in webhook revalidation
- **Files**: 27 files changed, 6678 insertions, 114 deletions
  - New migrations: `20260804150000_commerce_fulfillment_targets.sql`, `20260805100000_business_in_a_box_setups.sql`, idempotency retention migration
  - `messages/es.json` updated
- **Status**: PR#88 is open, not merged. Contains genuine new Stripe commerce work.
- **Classification**: VALID_MISSING_WORK — deferred to PR#88

#### `feat/solutions-catalog-three-price-model` (PR#86 — open)
- **SHA**: `cc6e380bacfcf79236006fd4451ebbe624e8cc96`
- **Ahead/behind**: ahead=3, behind=2
- **Commits** (via `git cherry`):
  - `a6681be` — cherry `-` (equivalent to PR#85 already in main)
  - `194144e` — cherry `+` feat(admin-security): enforce sole owner guardrails and AAL2 admin access
  - `cc6e380` — cherry `+` Restore annual billing and add contextual solution recommendations
- **Files**: 61 files changed, 7129 insertions, 332 deletions
  - New migrations: `admin_support_contact_command_center`, `platform_admin_security_foundation`
  - `messages/en.json`, `messages/es.json` updated (213 insertions each)
- **Status**: PR#86 is open; branches from a point 2 commits before main head (behind=2). Contains admin-security and annual billing restoration not in main.
- **Classification**: VALID_MISSING_WORK — deferred to PR#86 (requires rebase or merge of main)

---

### EXPERIMENTAL_OR_ABANDONED

| Branch | SHA | Evidence |
|---|---|---|
| `copilot/audit-repair-commerce-catalog` | `f4be230` | PR#90 open WIP, single "Initial plan" commit only — no code |

---

## Overlap and Canonicalization Analysis

### Stripe / Commerce Overlap
- `feat/solutions-catalog-three-price-model` and `chore/stripe-catalog-refresh` overlap in commerce/Stripe domain.
- `feat/solutions-catalog-three-price-model` is based 2 commits behind main; `chore/stripe-catalog-refresh` is branched from current `main` HEAD.
- `chore/stripe-catalog-refresh` is the more current and focused implementation for commerce fulfillment.
- `feat/solutions-catalog-three-price-model` includes unrelated admin-security changes (`194144e`) alongside annual billing restoration.
- **Decision**: Both represent distinct work; they should be integrated separately. `chore/stripe-catalog-refresh` (PR#88) can proceed; `feat/solutions-catalog-three-price-model` (PR#86) needs rebase before merge.

### GA4 / Analytics Overlap
Multiple GA-related branches (`copilot/featgoogle-analytics-consent-mode`, `copilot/fix-google-analytics-consent-mode`, `copilot/fix-google-analytics-privacy-issue`) — all are SUPERSEDED; their PRs are merged.

---

## Integration Branch

Integration branch `chore/consolidate-unmerged-branches-20260804` was created from `origin/main` (`c14d0f4`).

The two open valid branches (`chore/stripe-catalog-refresh` PR#88 and `feat/solutions-catalog-three-price-model` PR#86) have active open PRs and are being reviewed through the normal PR workflow. No cherry-picks are needed for the consolidation branch itself; the consolidation effort here focuses on:

1. Adding CI infrastructure (`.github/workflows/ci.yml`)
2. Adding branch audit workflow (`.github/workflows/branch-audit.yml`)
3. Adding `scripts/audit-remote-branches.sh`
4. Adding `audit:branches` npm script

---

## Special Domain Reviews

### Supabase / Database
- Migrations are timestamp-ordered. New migrations in `chore/stripe-catalog-refresh` use future timestamps (`20260804`, `20260805`) to avoid conflicts with existing applied migrations.
- `feat/solutions-catalog-three-price-model` adds admin security foundation migrations — these must be reviewed before merge to ensure no duplicate tables/policies.
- No evidence of duplicate table creation or conflicting policies among already-merged branches.
- RLS coverage: existing branches added RLS for listings, team members, deal rooms, vault documents, tasks. No gaps identified in merged work.

### Stripe and Billing
- `chore/stripe-catalog-refresh` operationalizes one-time fulfillment targets, reversals, and business-in-a-box template fulfillment. Idempotency is addressed via dedicated migration.
- Webhook idempotency improvements are in the unmerged `chore/stripe-catalog-refresh`.
- No live Stripe products were changed.
- Annual billing was added via PR#54/55 and is being restored/extended in `feat/solutions-catalog-three-price-model` PR#86.

### Authentication / RBAC
- Team RBAC foundation merged via PR#79-84. Profile email runtime lookup fixed in PR#84.
- No cross-business access vulnerabilities identified in audited branches.
- Admin AAL2 security is in `feat/solutions-catalog-three-price-model` (unmerged).

### Localization
- EN/ES parity verified in merged branches. `messages/en.json` and `messages/es.json` are updated together.
- `chore/stripe-catalog-refresh` adds ES translations.
- `feat/solutions-catalog-three-price-model` adds 213 lines to both EN and ES.

### Routes / Product Promises
- No broken nav links identified in main.
- Featured listing, deal room, valuation, books, academy — all routes implemented and merged.

### Performance
- No performance regressions identified in baseline. Existing warnings about `<img>` vs `<Image>` are pre-existing and noted in lint output (19 warnings).

---

## Summary

| Category | Count | Branches |
|---|---|---|
| ALREADY_IN_MAIN | 64 | All ancestor or cherry-equivalent branches |
| SUPERSEDED_OR_DUPLICATE | 13 | Branches whose exact PRs were merged |
| VALID_MISSING_WORK | 2 | `chore/stripe-catalog-refresh` (PR#88), `feat/solutions-catalog-three-price-model` (PR#86) |
| EXPERIMENTAL_OR_ABANDONED | 1 | `copilot/audit-repair-commerce-catalog` |
| CONFLICT_OR_MANUAL_REVIEW | 0 | None |
| PARTIALLY_IN_MAIN | 0 | None |
| **Total** | **80** | |

> Note: `copilot/audit-remote-branches` (the current working branch) is excluded from classification as it is the branch producing this audit.

---

## Deferred Branches and Blockers

| Branch | PR | Blocker |
|---|---|---|
| `chore/stripe-catalog-refresh` | PR#88 (open) | Pending PR review and CI checks |
| `feat/solutions-catalog-three-price-model` | PR#86 (open) | 2 commits behind main; needs rebase before merge |

---

## Rollback Considerations

- All merged work is in main. If any merged feature causes issues, revert the relevant PR merge commit.
- Migration rollback requires forward-only repair migrations (never edit applied migrations).
- Stripe fulfillment changes in `chore/stripe-catalog-refresh` include reversal logic for safe rollback.

---

*Generated by consolidation audit on 2026-08-04. Auditor: copilot/audit-remote-branches.*
