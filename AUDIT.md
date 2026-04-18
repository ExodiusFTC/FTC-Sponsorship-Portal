# Matchmaker — Full Codebase Audit

**Date:** 2026-04-18
**Model:** Claude Sonnet (claude-sonnet-4-6)
**Scope:** Read-only static analysis of the entire repository

## Finding Counts by Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 2     |
| HIGH     | 8     |
| MEDIUM   | 11    |
| LOW      | 4     |
| **Total**| **25**|

## Overall Health

The app has a well-structured foundation — server-side Zod validation, an atomic approval RPC with `FOR UPDATE` locking, append-only audit log, and SHA-256 token hashing for sponsor links — but a critical middleware naming bug silently disables all session refresh, route protection, and global rate limiting, and a non-atomic budget debit in the sponsor decision path creates a real race condition around the financial cap.

---

## Section 1 — Security

### 1.1 CRITICAL — Middleware File Is Misnamed; All Route Protection Silently Disabled

**Severity:** CRITICAL
**File:** [`proxy.ts:5`](proxy.ts:5)

Next.js only loads `middleware.ts` (or `src/middleware.ts`) as Edge Middleware. The file in this repo is named `proxy.ts` and exports a function called `proxy`, not `middleware`. Next.js will never invoke it.

**Consequences:**
1. `updateSession()` (the Supabase session-refresh helper) is never called, so server-side sessions go stale after the JWT TTL. Users whose cookies have expired will appear authenticated client-side but unauthenticated server-side — RLS queries silently operate as the anon role.
2. The global IP rate limiter (100 req/10 s via Upstash) is never applied, leaving all API routes and server actions open to flooding.
3. Any redirect logic added to middleware in the future would also silently not run.

The coach and admin layout server components do check `supabase.auth.getUser()` before rendering, so they provide a partial guard — but only for full page navigations, not for API routes like `/api/admin/queue/count` or `/api/webhooks/resend`.

**Fix:** Rename the file to `middleware.ts` and rename the exported function to `middleware`:

```ts
// middleware.ts
export async function middleware(request: NextRequest) { … }
```

---

### 1.2 CRITICAL — Non-Atomic Sponsor Budget Debit: Race Condition Allows Cap Exceeded

**Severity:** CRITICAL
**File:** [`app/actions/sponsor-decision.ts:81-122`](app/actions/sponsor-decision.ts:81)

When a sponsor records a decision (full or partial acceptance), the action:

1. Reads the team's `financial_ask_cents` (line 81–85)
2. Reads the sponsor's `funding_used_cents` and `funding_cap_cents` (line 87–91)
3. Checks `usedCents + amountCents > capCents` (line 104)
4. Updates `submissions.status = 'approved'` (line 109–112)
5. Updates `sponsors.funding_used_cents = newUsed` (line 114–122)
6. Inserts into `transactions_ledger` (line 125–132)

Steps 2–5 are **three separate, uncoordinated Supabase calls with no database transaction and no `SELECT FOR UPDATE` row lock**. If two sponsors both click "Accept" simultaneously on proposals targeting the same sponsor budget (or if the admin dispatches the same submission twice due to a retry), both reads can return the same `funding_used_cents`, both pass the cap check, and both writes proceed — the cap is exceeded and funds are double-committed.

This is in direct contrast to the admin approval path, which correctly uses `approve_submission_atomic` (an RPC with `SELECT … FOR UPDATE` on the sponsor row).

**Fix:** Create a Postgres RPC analogous to `approve_submission_atomic` — call it `record_sponsor_decision_atomic` — that wraps the capacity check, submission update, sponsor debit, and ledger insert in a single PL/pgSQL block with `SELECT … FOR UPDATE` on the sponsors row.

---

### 1.3 HIGH — `uploadCredentials` Has No Server-Side File Type or Size Validation

**Severity:** HIGH
**File:** [`app/actions/auth.ts:70-95`](app/actions/auth.ts:70)

The `uploadCredentials` server action accepts `FormData` and calls `supabase.storage.upload()` without any server-side checks on file type, MIME type, or file size. Specifically:

- **No extension check:** `fileExt` is derived from `file.name.split('.').pop()` (line 83). If the uploaded file has no extension, `filePath` becomes `${user.id}/credentials.undefined`.
- **No MIME type check:** The `contentType` is not explicitly set, so Supabase will store whatever the client sends as Content-Type.
- **No size check:** There is no equivalent of the 2 MB guard present in `team.ts:132`.

By contrast, `uploadTeamLogo` (team.ts:128–134) validates both extension and size on the server.

The `coach-credentials` bucket is private, but a malicious authenticated user could fill the bucket with arbitrarily large files, waste storage quota, and cause admin confusion.

**Fix:** Add the same guard pattern as `uploadTeamLogo`:

```ts
const allowedExts = ['pdf', 'jpg', 'jpeg', 'png']
if (!ext || !allowedExts.includes(ext)) return { error: '…' }
if (file.size > 10 * 1024 * 1024) return { error: 'File must be under 10 MB' }
```

---

### 1.4 HIGH — Coaches Can Read All Sponsor Columns Including Contact PII

**Severity:** HIGH
**File:** [`app/(coach)/sponsors/browse/page.tsx:17`](app/(coach)/sponsors/browse/page.tsx:17)

The browse page issues `select('*')` on the sponsors table, and the RLS policy (migration 0001, line 444–448) allows verified coaches to read all columns of active sponsors. Postgres RLS is row-level, not column-level; there is no column restriction. Coaches therefore receive `contact_name`, `contact_email`, `contact_title`, `notes`, `funding_cap_cents`, and `funding_used_cents` in the API response — fields the page does not use and that coaches should not see.

`contact_email` is the direct line to a corporate contact; `notes` may contain internal admin commentary. Exposing these to coaches breaks the data-separation principle the app is built around.

**Fix:** Replace `select('*')` with a minimal projection:

```ts
.select('id, company_name, industry, website, funding_cap_cents, funding_used_cents, status')
```

---

### 1.5 HIGH — `youtube_url` Rendered as Unsanitized `href` on Sponsor-View Page

**Severity:** HIGH
**File:** [`app/sponsor-view/[token]/page.tsx:137`](app/sponsor-view/[token]/page.tsx:137)

The sponsor-view public page renders the team's `youtube_url` field as a direct anchor `href` without validating that the value is a legitimate HTTPS YouTube URL:

```tsx
<a href={String(team.youtube_url)} target="_blank" rel="noreferrer" …>
```

A coach (or an attacker who gains write access) could store `javascript:alert(document.cookie)` or a phishing URL here. While `rel="noreferrer"` prevents opener access, modern browsers still execute `javascript:` URLs in anchor clicks in some configurations. Additionally, any arbitrary URL can be used as an open redirect toward a phishing page, which is especially damaging in this context — this page is the only touchpoint most corporate sponsors will have with the platform.

The same field is rendered in the sponsor email template (`emails/submission-email.tsx`) as a link, compounding the risk.

**Fix:** Validate the URL on write (Zod `z.string().url().regex(/^https:\/\/(www\.)?youtube\.com\//)`) and also sanitize on render:

```ts
const safeYt = team.youtube_url && String(team.youtube_url).startsWith('https://') ? String(team.youtube_url) : null
```

---

### 1.6 HIGH — Token Marked `used_at` Before Decision Writes Complete; No Transaction

**Severity:** HIGH
**File:** [`app/actions/sponsor-decision.ts:57-144`](app/actions/sponsor-decision.ts:57)

The action marks the token as `used_at = now()` (line 59–61) **before** performing any of the financial writes (submission status update, sponsor debit, ledger insert). If any subsequent write fails — e.g., the Resend `sendHandshakeEmail` call at line 144 throws before the audit log write — the token is permanently consumed but the transaction is incomplete. The submission may remain in `approved` status with no ledger entry and no email sent.

This is a non-idempotent operation with no retry path.

**Fix:** Move the `used_at` mark to the end of all database writes (or better, wrap everything in the atomic RPC described in finding 1.2). Email dispatch should happen after all DB writes succeed.

---

### 1.7 HIGH — Signup Rate Limiting Silently Disabled When Upstash Is Unconfigured

**Severity:** HIGH
**File:** [`lib/rate-limit.ts`](lib/rate-limit.ts), [`app/actions/auth.ts:11`](app/actions/auth.ts:11)

`checkActionLimit` (used for signup rate-limiting) returns `{ ok: true }` when `actionLimiter` is null (Upstash not configured). The `actionLimiter` is null when `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` are absent — which they are by default (both are optional in `lib/env.ts:14–15`).

In any environment where Upstash is not wired up (staging, preview deploys, self-hosted), the signup endpoint is unthrottled. An attacker can enumerate valid email addresses or trigger mass Supabase auth signups without any server-side barrier.

Note: the middleware-level global rate limiter (proxy.ts) also doesn't run due to finding 1.1, so no rate limiting is in effect at any layer unless Upstash is configured.

**Fix:** Make `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` required in `lib/env.ts` for production, or implement a database-backed signup rate limiter as a fallback that does not silently no-op.

---

### 1.8 HIGH — `contact_name` Set to `company_name` When Approving Sponsor Application

**Severity:** HIGH (data integrity)
**File:** [`app/actions/admin.ts:62`](app/actions/admin.ts:62)

When an admin approves a public sponsor application, the action creates a sponsor record with:

```ts
contact_name: app.company_name,  // BUG: should be app.contact_name
contact_email: app.contact_email,
```

The `contact_name` field from the application form is silently discarded; the company name is stored as the contact name instead. All subsequent sponsor communications will address the contact as the company name rather than their personal name.

**Fix:** Change line 62 to `contact_name: app.contact_name ?? app.company_name`.

---

### 1.9 MEDIUM — Resend Webhook Skips Signature Verification Outside Production

**Severity:** MEDIUM
**File:** [`app/api/webhooks/resend/route.ts:15-21`](app/api/webhooks/resend/route.ts:15)

When `RESEND_WEBHOOK_SECRET` is not set (it is optional in `lib/env.ts:12`), the handler logs a warning and proceeds without verifying the Svix signature. If a staging or preview deployment is exposed with `NODE_ENV !== 'production'`, any anonymous caller can POST fabricated webhook events and flip submission statuses to `opened` or `bounced` by guessing a valid `resend_message_id`.

**Fix:** Require `RESEND_WEBHOOK_SECRET` in all internet-accessible deployments. At minimum, return 503 instead of proceeding when the secret is absent, even in non-production:

```ts
if (!env.RESEND_WEBHOOK_SECRET) {
  return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
}
```

---

### 1.10 MEDIUM — `declineSubmission` / `requestEdit` Accept Any Submission ID Without Status Guard

**Severity:** MEDIUM
**File:** [`app/actions/moderation.ts:61-139`](app/actions/moderation.ts:61)

Both `declineSubmission` and `requestEdit` update a submission by ID without first checking that the submission is in `pending` or `changes_requested` status. An admin could accidentally (or maliciously) decline an already-`approved` submission or request edits on one that has been `dispatched`, corrupting the state machine and confusing downstream email and token logic.

**Fix:** Add a status pre-check analogous to what `approve_submission_atomic` does:

```ts
const { data: sub } = await supabase.from('submissions').select('status').eq('id', submissionId).single()
if (!sub || sub.status !== 'pending') return { error: 'Submission is not pending review' }
```

---

### 1.11 MEDIUM — `CRON_SECRET` Not Validated in `lib/env.ts` and Absent from `.env.example`

**Severity:** MEDIUM
**File:** [`app/api/cron/expire-submissions/route.ts:8`](app/api/cron/expire-submissions/route.ts:8), [`lib/env.ts`](lib/env.ts)

The cron handler compares `Authorization: Bearer {CRON_SECRET}` against `process.env.CRON_SECRET`, but:
1. `CRON_SECRET` is not declared in `lib/env.ts`, so it bypasses startup validation.
2. It is absent from `.env.example`, so new developers don't know it exists.

If `CRON_SECRET` is not set in production, `process.env.CRON_SECRET` is `undefined` and the check becomes `authHeader !== 'Bearer undefined'`. Any request with header `Authorization: Bearer undefined` would be accepted.

Additionally, if the variable is genuinely missing (unset), all legitimate Vercel cron calls will be rejected with 401, and submitted applications will never expire — sponsors will hold open "approved" links indefinitely past the 14-day window.

**Fix:** Add to `lib/env.ts`:
```ts
CRON_SECRET: z.string().min(32),
```
And add it to `.env.example`.

---

## Section 2 — Performance

### 2.1 HIGH — `SELECT *` on Large Joins Returns Unnecessary Data

**Severity:** HIGH
**Files:**
- [`lib/dispatch.ts:11-23`](lib/dispatch.ts:11) — `select('*, teams:team_id(*, profiles:owner_id(...)), sponsors:sponsor_id(*)')` loads every column on teams (including all JSON blobs: `budget_items`, `media_urls`), sponsors, and the profile, when only a subset of fields is used.
- [`app/(coach)/sponsors/browse/page.tsx:17`](app/(coach)/sponsors/browse/page.tsx:17) — `select('*')` on sponsors returns all columns; the page uses 6.
- [`app/actions/submission.ts:194`](app/actions/submission.ts:194) — `select('*')` in `cloneSubmission`.
- [`app/actions/admin.ts:52`](app/actions/admin.ts:52) — `select('*')` on `sponsor_applications`.

**Fix:** Use explicit column projections in all Supabase queries.

---

### 2.2 HIGH — No Pagination on Unbounded Queries

**Severity:** HIGH
**Files:**
- [`app/(coach)/sponsors/browse/page.tsx:16-20`](app/(coach)/sponsors/browse/page.tsx:16) — loads all active sponsors with no limit.
- [`app/(admin)/analytics/page.tsx:20`](app/(admin)/analytics/page.tsx:20) — `v_submission_summary` SELECT * loads all submissions in the view.
- [`app/(admin)/coaches/page.tsx`](app/(admin)/coaches/page.tsx) — loads all coaches (unverified, verified, pending) with no pagination.

As the platform scales, these queries will cause increasingly slow page loads and may hit Supabase response size limits.

**Fix:** Add `.range(0, 49)` (or equivalent pagination) and a "load more" control for coach-facing lists, and cap admin summary views at reasonable limits (e.g., 100 rows) with explicit ordering.

---

### 2.3 MEDIUM — Sequential Awaits in Analytics Page Could Be Parallelized

**Severity:** MEDIUM
**File:** [`app/(admin)/analytics/page.tsx:18-27`](app/(admin)/analytics/page.tsx:18)

Three independent Supabase queries execute sequentially:

```ts
const { data: capacityData }      = await supabase.from('v_sponsor_capacity').select('*')
const { data: submissionSummary } = await supabase.from('v_submission_summary').select('*')
const { data: pendingCoaches }    = await supabase.from('profiles').select(…)
```

None depends on the others. On a cold database connection this adds 3 round-trips where 1 (via `Promise.all`) would suffice.

**Fix:**
```ts
const [capacityResult, summaryResult, coachResult] = await Promise.all([
  supabase.from('v_sponsor_capacity').select('*'),
  (supabase as any).from('v_submission_summary').select('*'),
  supabase.from('profiles').select('id, full_name, created_at')…,
])
```

---

### 2.4 MEDIUM — Google Fonts Loaded via External `@import` Instead of `next/font`

**Severity:** MEDIUM
**File:** [`app/globals.css:1`](app/globals.css:1)

Inter and JetBrains Mono are loaded with a Google Fonts `@import` URL. This:
1. Adds a render-blocking external DNS + TCP + TLS request before the first byte of font data.
2. Does not automatically subset to Latin characters (the URL does not include `&subset=latin`).
3. Sends visitor IP addresses to Google, which may be a GDPR consideration for EU users.

`next/font` (already a project dependency as part of Next.js) self-hosts fonts with automatic subsetting, eliminates the external request, and optimises `font-display`.

**Fix:** Move font declarations to `app/layout.tsx` using `next/font/google`:
```ts
import { Inter, JetBrains_Mono } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], display: 'swap' })
```
And remove the `@import` from `globals.css`.

---

### 2.5 LOW — Raw `<img>` Tag on Sponsor-View Page Missing `next/image` Optimisation

**Severity:** LOW
**File:** [`app/sponsor-view/[token]/page.tsx:69`](app/sponsor-view/[token]/page.tsx:69)

The sponsor-view page uses a bare `<img>` tag for the team hero image:
```tsx
<img src={mediaUrls[0]} alt="Team photo" className="w-full h-56 object-cover rounded-lg mb-4" />
```

`next/image` would provide automatic WebP/AVIF conversion, lazy loading, and CLS-prevention via `width`/`height` reservation.

**Fix:** Replace with `<Image>` from `next/image`, supplying `width={800}` and `height={224}` (matching `h-56`) and configuring the Supabase storage domain in `next.config.ts`.

---

### 2.6 LOW — `useSWR` Key Instability in Sidebar

**Severity:** LOW
**File:** [`components/sidebar.tsx:351-355`](components/sidebar.tsx:351)

The SWR key `'/api/admin/queue/count'` is a string literal — stable and correct. However, the fetcher is defined inline: `(url: string) => fetch(url).then((r) => r.json())`. This creates a new function reference on every render. While SWR compares fetchers by reference for some optimizations, this is a minor inconsistency; the key being stable means there's no refetch storm. Still worth extracting the fetcher to a module-level constant.

---

## Section 3 — Code Quality and TypeScript

### 3.1 HIGH — Hand-Written Supabase Types Are Incomplete; Forces `as any` Casts

**Severity:** HIGH
**File:** [`lib/supabase/types.ts`](lib/supabase/types.ts)

The database types file is maintained by hand rather than generated via `supabase gen types typescript`. It is missing type definitions for at least:
- `submission_access_tokens` table (added in migration 0018)
- `transactions_ledger` table (added in migration 0017)
- Several view types added in later migrations

This is the root cause of at least 10 `as unknown as any` casts throughout the codebase:
- `app/sponsor-view/[token]/page.tsx:35` — `createAdminClient() as unknown as any`
- `app/actions/sponsor-decision.ts:28` — `supabase as unknown as any`
- `app/actions/moderation.ts:28` — `supabase as unknown as any`
- `app/(admin)/analytics/page.tsx:20` — `supabase as any`
- `app/actions/sponsor.ts:89` — `metadata: result.data as any`
- `app/actions/team.ts:67`, `165` — payload typed as `any`
- `app/api/webhooks/resend/route.ts:60` — `status: statusToSet as any`

Every `any` cast is a point where TypeScript cannot catch schema mismatches.

**Fix:** Add `supabase gen types typescript --project-id cvvmtklqsihxjfnenczi > lib/supabase/types.ts` to the CI pipeline and run it after every migration.

---

### 3.2 MEDIUM — `CRON_SECRET` Missing from `lib/env.ts` Validation

**Severity:** MEDIUM
**File:** [`lib/env.ts`](lib/env.ts)

See finding 1.11. The `lib/env.ts` central config module is the right pattern, but it doesn't validate `CRON_SECRET`, so a missing secret causes a silent runtime failure rather than a loud startup error.

---

### 3.3 MEDIUM — Duplicate Migration File

**Severity:** MEDIUM
**File:** [`supabase/migrations/0012_revised_analytics_views.sql`](supabase/migrations/0012_revised_analytics_views.sql)

Migration `0012` is byte-for-byte identical to `0010_analytics_views.sql`. Both files `CREATE OR REPLACE` the same view (`v_submission_summary`), so the net effect is idempotent. But the duplicate:
1. Misleads developers into thinking 0012 is a revision when it is not.
2. Wastes a migration slot.
3. Will appear in `supabase db diff` output as a spurious change.

**Fix:** Delete `0012_revised_analytics_views.sql` and add an explanatory comment in `0010`.

---

### 3.4 MEDIUM — pgTAP Tests Reference Dropped `pitches` Table

**Severity:** MEDIUM
**File:** [`supabase/migrations/0007_rls_tests.sql`](supabase/migrations/0007_rls_tests.sql)

Migration 0007 contains pgTAP tests that verify the existence of a `pitches` table and its RLS configuration. Migration 0008 dropped `pitches` and replaced it with `submissions`. The pgTAP tests will fail on the current schema, providing false confidence when they appear in CI output.

**Fix:** Update 0007 to test `submissions` instead of `pitches`, and verify that the test suite can be run against the current schema.

---

### 3.5 MEDIUM — Magic Numbers Not Extracted to Named Constants

**Severity:** MEDIUM
**Files:** Multiple

Business-critical limits are hardcoded as inline literals throughout the codebase. Changing any of them requires a multi-file search:

| Value | Location | What it controls |
|-------|----------|-----------------|
| `3` | `app/actions/submission.ts:49` | Max pending submissions per window |
| `7 * 24 * 60 * 60 * 1000` | `app/actions/submission.ts:47` | Submission rate window (7 days) |
| `14 * 24 * 60 * 60 * 1000` | `app/actions/moderation.ts:49` | Sponsor response window (14 days) |
| `2 * 1024 * 1024` | `app/actions/team.ts:132` | Max logo file size (2 MB) |
| `500000` | `app/(coach)/sponsors/browse/page.tsx:30` | "High capacity" threshold ($5,000) |

**Fix:** Create `lib/constants.ts`:
```ts
export const MAX_PENDING_SUBMISSIONS = 3
export const SUBMISSION_WINDOW_DAYS = 7
export const SPONSOR_RESPONSE_WINDOW_DAYS = 14
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024
```

---

### 3.6 MEDIUM — Broken Route in Sponsor Browse Page

**Severity:** MEDIUM
**File:** [`app/(coach)/sponsors/browse/page.tsx:75`](app/(coach)/sponsors/browse/page.tsx:75)

The "Target in Pitch" button for every sponsor card links to `/pitches/new?sponsor=${sponsor.id}`. This route was renamed to `/submissions/new` in the pivot migration (0008). The button is currently broken for all coaches — clicking it returns a 404.

The same stale route reference appears in the E2E test: [`tests/e2e/golden-path.spec.ts`](tests/e2e/golden-path.spec.ts) step 4.

**Fix:** Change the `href` to `/submissions/new?sponsor=${sponsor.id}` in both the page component and the test.

---

### 3.7 LOW — `components/site-header.tsx` Appears to Be Dead Code

**Severity:** LOW
**File:** [`components/site-header.tsx`](components/site-header.tsx)

The `SiteHeader` component is defined as a server component but is not imported in any current layout. Both the coach layout (`app/(coach)/layout.tsx`) and the admin layout (`app/(admin)/layout.tsx`) use `AppLayout` + `Sidebar`. The root layout (`app/layout.tsx`) does not import it either.

**Fix:** Confirm it is unused and delete it to reduce maintenance surface.

---

### 3.8 LOW — `coaches/page.tsx` Displays Admin-Promotion SQL in the UI

**Severity:** LOW (operational / UX)
**File:** [`app/(admin)/analytics/page.tsx:217-218`](app/(admin)/analytics/page.tsx:217)

The analytics page renders a raw SQL snippet as a UI hint for how to promote a user to admin:

```
UPDATE profiles SET coach_verified = true WHERE id = '<id above>';
```

This is an operational workaround in the production UI, not a proper admin workflow. It also has a minor error — the comment says "coach_verified" but admin promotion requires `SET role = 'admin'`. The correct SQL is never provided, so admins must already know how to do this.

**Fix:** Implement a proper "Promote to Admin" server action behind an additional confirmation step, or at minimum correct the SQL hint.

---

## Section 4 — Architecture and Scalability

### 4.1 HIGH — Route Protection Depends on Middleware That Never Runs

**Severity:** HIGH
**File:** [`proxy.ts`](proxy.ts), [`app/(coach)/layout.tsx`](app/(coach)/layout.tsx), [`app/(admin)/layout.tsx`](app/(admin)/layout.tsx)

Route protection is currently implemented in two layers:
1. **Layout-level server checks:** Both `(coach)/layout.tsx` and `(admin)/layout.tsx` call `supabase.auth.getUser()` and redirect if the session is absent or the role is wrong. This works for page navigations.
2. **Action-level checks:** Every server action calls `requireAdmin()` or `getCoachTeamId()` before any mutation. This is correct and independent.

However, `middleware.ts` (currently `proxy.ts`) is the intended layer for refreshing sessions before layouts run. Without it, a user whose JWT has expired will reach the layout's `getUser()` call with a stale cookie. Supabase's `getUser()` can still validate the token against the auth server, but the session will not be automatically refreshed — users get logged out unexpectedly rather than having their session silently extended.

The API route `/api/admin/queue/count` has its own auth check but relies on the session being fresh. Without middleware session refresh, stale-session API calls fail silently.

**Fix:** Fix the middleware naming (finding 1.1). The existing protection architecture is otherwise sound.

---

### 4.2 HIGH — Synchronous Email Dispatch Blocks Approval Response; No Retry Path

**Severity:** HIGH
**File:** [`app/actions/moderation.ts:53-56`](app/actions/moderation.ts:53)

After `approve_submission_atomic` succeeds (submission atomically marked approved, token minted), the action calls:

```ts
await Promise.all([
  sendSubmissionDecisionEmail(submissionId, 'approved'),
  dispatchApprovedSubmission(submissionId, result.token),
])
```

Both email calls are synchronous in the request handler. If Resend is unavailable or rate-limits the request:
1. The admin sees an error and may retry, but the submission is already `approved` in the database. Retrying calls `approve_submission_atomic` again, which returns `submission_not_pending` — so the retry logic is broken.
2. The sponsor never receives their proposal email, with no recovery path other than manual database intervention.

**Fix:** Move email dispatch to a background job (e.g., a Postgres queue, Vercel Background Function, or at minimum a Resend retry-enabled call). The approval action should return success as soon as the DB write succeeds, and email failures should be tracked in the `submissions` table (e.g., a `dispatch_failed_at` column) so admins can re-dispatch from the moderation UI.

---

### 4.3 MEDIUM — Supabase Client Instantiation Is Consistent But Not Centrally Enforced

**Severity:** MEDIUM
**File:** [`lib/supabase/server.ts`](lib/supabase/server.ts), [`lib/supabase/admin.ts`](lib/supabase/admin.ts), [`lib/supabase/client.ts`](lib/supabase/client.ts)

The three client factories (server, admin, browser) are properly centralized, and no file appears to call `createClient` inline from `@supabase/supabase-js` directly. This is the correct pattern.

However, `app/actions/auth.ts:22` calls `await createClient()` from `@/lib/supabase/server`, while `app/actions/sponsor-decision.ts:3` imports `createAdminClient` from `@/lib/supabase/admin` — both intentional and correct. The observation is that new developers may not know which factory to use. A top-level `lib/supabase/index.ts` barrel is present and exports all three, but `CLAUDE.md` doesn't document the distinction. Consider adding a comment block to `index.ts` explaining when each is appropriate.

---

### 4.4 MEDIUM — Approval Partially Duplicated Between RPC and Application Layer

**Severity:** MEDIUM
**File:** [`app/actions/moderation.ts:29-56`](app/actions/moderation.ts:29), [`supabase/migrations/0020_fix_approval_semantics.sql`](supabase/migrations/0020_fix_approval_semantics.sql)

Migration 0020 revised `approve_submission_atomic` to **not** debit `funding_used_cents` (the debit was moved to `recordSponsorDecision`). The RPC still performs the capacity check (line 39 of 0020). This means:

- At approval time: capacity check ✓, status → approved ✓, token minted ✓
- At decision time: capacity check ✓ (again), debit applied ✓

The double capacity check is harmless but confusing — the RPC checks capacity at approval, but by the time the sponsor decides, more funding may have been committed to other teams, making the approval-time check stale. The real guard must be at decision time (which exists), so the check in the RPC is redundant and misleading.

**Fix:** Remove the capacity check from `approve_submission_atomic` or document in the RPC why it is pre-validating a condition that will be re-checked later.

---

## Section 5 — Accessibility

### 5.1 HIGH — `var(--text-muted)` on `var(--bg-app)` Fails WCAG AA in Dark Mode

**Severity:** HIGH
**File:** [`app/globals.css:152-159`](app/globals.css:152)

In dark mode, the design tokens are:
- `--text-muted: #52525B`
- `--bg-app: #000000`

**Calculated contrast ratio: 2.72:1** (WCAG AA requires 4.5:1 for normal text, 3:1 for large text).

`--text-muted` is used for secondary UI text, field hints, timestamps, and labels throughout all page components. This text is illegible for users with low vision.

In light mode, `--text-muted: #A1A1AA` on `--bg-app: #FFFFFF` gives approximately 2.56:1, also failing AA.

**Fix:** Darken `--text-muted` in dark mode to at least `#737373` (which achieves ~4.6:1 on black) and lighten it in light mode to at least `#767676` (which achieves ~4.54:1 on white).

---

### 5.2 MEDIUM — ThemeToggle Button Has No `aria-label`

**Severity:** MEDIUM
**File:** [`components/sidebar.tsx:187-219`](components/sidebar.tsx:187)

The `ThemeToggle` button renders only an icon (`<Sun>` or `<Moon>`) with no accessible label. It has a `title` attribute (line 205: `title={\`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode (M)\``), but `title` is not exposed to screen readers in all contexts.

**Fix:** Add `aria-label={...}` with the same value as `title`.

---

### 5.3 MEDIUM — `UserRow` Dropdown Button Lacks `aria-expanded` and `aria-haspopup`

**Severity:** MEDIUM
**File:** [`components/sidebar.tsx:246-265`](components/sidebar.tsx:246)

The user dropdown button expands a menu but does not announce its state to screen readers — no `aria-expanded={open}`, no `aria-haspopup="menu"`, and no `aria-controls` pointing to the dropdown. Screen reader users cannot tell whether the button opens a menu or performs an action.

**Fix:**
```tsx
<button
  aria-expanded={open}
  aria-haspopup="menu"
  aria-label="User menu"
  …
>
```

---

### 5.4 MEDIUM — Focus Management in Moderation Dialog Components Is Unverified

**Severity:** MEDIUM
**File:** [`components/admin/moderation-actions.tsx`](components/admin/moderation-actions.tsx)

The moderation queue uses Dialog components (from `components/ui/dialog.tsx`, which wraps Base UI) for "Request Edit" and "Decline" actions. Base UI's Dialog primitive does handle focus trapping and return-focus natively, but the implementation depends on whether the components are correctly composed (trigger element properly linked to the dialog, `DialogTrigger` wrapping the button).

Without running the app, this cannot be fully verified. However, if the dialog trigger and dialog content are not associated via the Base UI `Dialog.Root`/`Dialog.Trigger`/`Dialog.Content` composition, focus will not move into the modal when it opens, and will not return to the triggering button when it closes.

**Fix:** Confirm via manual keyboard testing (Tab into "Request Edit" button → Enter → Tab through modal fields → Escape → focus returns to button). If focus is not managed, use Base UI's `Dialog.Trigger` as the wrapper element.

---

## Section 6 — Summary and Priority Order

1. **[CRITICAL] Security** — Middleware file named `proxy.ts` instead of `middleware.ts`; Next.js never loads it; all session refresh and route protection is disabled — [`proxy.ts:5`](proxy.ts:5)
2. **[CRITICAL] Security** — Non-atomic sponsor budget debit in `recordSponsorDecision`; race condition allows cap to be exceeded — [`app/actions/sponsor-decision.ts:81`](app/actions/sponsor-decision.ts:81)
3. **[HIGH] Security** — `uploadCredentials` has no server-side file type or size validation — [`app/actions/auth.ts:70`](app/actions/auth.ts:70)
4. **[HIGH] Security** — `SELECT *` on sponsors exposes contact PII (email, name, notes) to verified coaches — [`app/(coach)/sponsors/browse/page.tsx:17`](app/(coach)/sponsors/browse/page.tsx:17)
5. **[HIGH] Security** — `youtube_url` rendered as unsanitized `href`; open redirect and stored XSS risk — [`app/sponsor-view/[token]/page.tsx:137`](app/sponsor-view/[token]/page.tsx:137)
6. **[HIGH] Security** — Token marked `used_at` before decision writes complete; no transaction — [`app/actions/sponsor-decision.ts:57`](app/actions/sponsor-decision.ts:57)
7. **[HIGH] Security** — Signup rate limiting silently no-ops when Upstash is unconfigured — [`lib/rate-limit.ts`](lib/rate-limit.ts)
8. **[HIGH] Security** — `contact_name` set to `company_name` when approving sponsor applications — [`app/actions/admin.ts:62`](app/actions/admin.ts:62)
9. **[HIGH] Performance** — `SELECT *` in `dispatch.ts`, `sponsors/browse`, `cloneSubmission`, admin actions — multiple files
10. **[HIGH] Performance** — No pagination on sponsors browser, submission summary, coaches list — multiple files
11. **[HIGH] Code Quality** — Hand-written `lib/supabase/types.ts` missing new tables; root cause of 10+ `as any` casts — [`lib/supabase/types.ts`](lib/supabase/types.ts)
12. **[HIGH] Architecture** — Synchronous email dispatch in approval handler; Resend failure corrupts approval state — [`app/actions/moderation.ts:53`](app/actions/moderation.ts:53)
13. **[HIGH] Accessibility** — `--text-muted` (#52525B) on `--bg-app` (#000000) in dark mode: 2.72:1 contrast ratio, fails WCAG AA — [`app/globals.css:152`](app/globals.css:152)
14. **[MEDIUM] Security** — Resend webhook skips signature verification when `RESEND_WEBHOOK_SECRET` is unset — [`app/api/webhooks/resend/route.ts:15`](app/api/webhooks/resend/route.ts:15)
15. **[MEDIUM] Security** — `declineSubmission`/`requestEdit` accept any submission ID without status guard — [`app/actions/moderation.ts:61`](app/actions/moderation.ts:61)
16. **[MEDIUM] Security** — `CRON_SECRET` not validated in `lib/env.ts`; absent from `.env.example` — [`lib/env.ts`](lib/env.ts)
17. **[MEDIUM] Performance** — Three sequential awaits in analytics page could be `Promise.all`'d — [`app/(admin)/analytics/page.tsx:18`](app/(admin)/analytics/page.tsx:18)
18. **[MEDIUM] Performance** — Google Fonts loaded via external `@import`; should use `next/font` — [`app/globals.css:1`](app/globals.css:1)
19. **[MEDIUM] Code Quality** — Duplicate migration `0012_revised_analytics_views.sql` identical to `0010` — [`supabase/migrations/0012_revised_analytics_views.sql`](supabase/migrations/0012_revised_analytics_views.sql)
20. **[MEDIUM] Code Quality** — pgTAP tests reference dropped `pitches` table — [`supabase/migrations/0007_rls_tests.sql`](supabase/migrations/0007_rls_tests.sql)
21. **[MEDIUM] Code Quality** — Business-critical limits hardcoded as magic numbers across multiple files — multiple files
22. **[MEDIUM] Code Quality** — Broken route `/pitches/new` in sponsor browse page and golden-path E2E test — [`app/(coach)/sponsors/browse/page.tsx:75`](app/(coach)/sponsors/browse/page.tsx:75)
23. **[MEDIUM] Accessibility** — `ThemeToggle` button has no `aria-label` — [`components/sidebar.tsx:187`](components/sidebar.tsx:187)
24. **[MEDIUM] Accessibility** — `UserRow` dropdown missing `aria-expanded` and `aria-haspopup` — [`components/sidebar.tsx:246`](components/sidebar.tsx:246)
25. **[LOW] Code Quality** — `components/site-header.tsx` appears to be dead code — [`components/site-header.tsx`](components/site-header.tsx)
