# Google Ads Launch Readiness

## Scope

This document describes the implementation and validation baseline for launching the first Google Ads campaign for Ownward Hub, with privacy-first conversion measurement.

## Baseline Validation (Before Changes)

Commands executed on branch `feat/google-ads-launch-readiness` before implementation:

- `npm test -- --runInBand`
- `npm run lint`
- `npm run build`

Results:

- Tests: `47` suites passed, `976` tests passed
- Lint: `0` errors, `19` pre-existing warnings
- Build: successful production build, static generation complete

## Privacy and Consent Constraints

The implementation preserves these constraints:

- No Google AdSense integration
- No ad units, no Auto Ads, no `ads.txt` changes
- No ad consent grants (`ad_storage`, `ad_user_data`, `ad_personalization` remain denied)
- Analytics events fire only when analytics consent is granted
- Event params are sanitized to avoid PII leakage

## Implemented Conversion Events

The following GA4 events are implemented and consent-gated:

1. `readiness_check_complete`
   - Trigger: user submits the final readiness question (completion action), not hydration or page revisit
   - File: `components/business-idea-readiness/BusinessIdeaReadinessAssessment.tsx`

2. `valuation_complete`
   - Trigger: successful valuation generation redirect includes a server-issued nonce validated against HttpOnly cookie
   - Files: `app/[locale]/valuation/actions.ts`, `app/[locale]/valuation/[reportId]/page.tsx`, `components/valuation/ValuationCompleteTracker.tsx`

3. `generate_lead`
   - Trigger: contact API request succeeds after DB insert
   - File: `app/[locale]/contact/page.tsx`

4. `sign_up`
   - Trigger: successful signup redirect to check-email with server-issued nonce validated against HttpOnly cookie
   - Files: `app/api/signup/route.ts`, `app/[locale]/signup/actions.ts`, `app/[locale]/check-email/page.tsx`, `components/analytics/SignupSuccessTracker.tsx`

5. `begin_checkout`
   - Trigger: Stripe checkout URL is returned successfully, immediately before redirect
   - Files:
     - `app/[locale]/pricing/PricingCards.tsx`
     - `components/solutions/SolutionCheckoutButton.tsx`
     - `app/[locale]/products/value-action-sprint/PurchaseCard.tsx`
     - `components/FeaturedListingButton.tsx`

## Purchase Event Feasibility

### Current status

A GA4 `purchase` event is not implemented in this change set.

### Blocker

A reliable and privacy-safe `purchase` event should be emitted from verified Stripe webhook outcomes while preserving attribution quality and idempotency. Current architecture does not persist a GA client identifier or ad click identifiers in a verified, consent-compatible linkage from browser to webhook fulfillment path.

Without this linkage, server-side purchase emission from webhook can be technically possible but attribution quality would be degraded and may create inconsistent reporting versus ad click/session origin.

### Recommendation

Implement a dedicated purchase attribution bridge in a follow-up:

1. Capture consent-allowed attribution identifiers client-side at checkout start.
2. Persist them in a signed, non-PII, expiring mapping tied to checkout session ID.
3. Emit server-side `purchase` from webhook fulfillment using idempotent session keys.
4. Add explicit tests for duplicate webhook delivery and attribution fallback behavior.

## Indexing and Crawl Hygiene

### Sitemap updates

Private utility pages were removed from sitemap route list (for example, document vault/upload utilities), and campaign/public pages are included.

File: `app/sitemap.ts`

### Robots updates

Robots disallow patterns were added for private utility/authenticated areas and API paths.

File: `app/robots.ts`

### Utility page noindex

`check-email` page now includes noindex/nofollow metadata.

File: `app/[locale]/check-email/page.tsx`

## Campaign Destination Improvements

The business-idea-readiness destination page now includes clearer expectations for paid traffic:

- what users get
- time-to-complete
- privacy and personal-data clarity
- immediate next-step CTA (`/start`)
- support CTA (`/contact`)
- EN/ES parity

File: `app/[locale]/business-idea-readiness-check/page.tsx`

## Contact Flow Hardening

The contact API now enforces a persistent, distributed DB-backed throttle by normalized sender email in a rolling 10-minute window.

Current limitation: this is durable across serverless instances but remains email-based. Attackers rotating email values can still bypass this specific limit; additional IP/device/global abuse controls remain a follow-up hardening layer.

File: `app/api/contact/route.ts`

## Environment Variables

Required or relevant environment variables:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (GA4 measurement ID)
- `NEXT_PUBLIC_SITE_URL` (canonical site URL)
- Existing Stripe and Supabase variables for checkout/webhook flows

## Verification Checklist

1. Confirm consent banner default denies analytics/ad storage until explicit opt-in.
2. In GA DebugView, verify:
   - `begin_checkout`
   - `readiness_check_complete`
   - `valuation_complete`
   - `generate_lead`
   - `sign_up`
3. Confirm no event payload includes personal identifiers.
4. Validate robots and sitemap outputs:
   - `/robots.txt`
   - `/sitemap.xml`
5. Validate noindex behavior for check-email utility route.
6. Re-run tests, lint, and build.

## Manual Steps in Google Ads / GA4

1. Create GA4 key events for the implemented conversion events.
2. Import GA4 key events into Google Ads as conversions.
3. Build campaign around:
   - `/business-idea-readiness-check` (EN)
   - `/es/business-idea-readiness-check` (ES)
4. Add final URL-level UTM conventions and naming standards.
5. Plan purchase-event bridge implementation before scaling campaigns optimized to revenue.
