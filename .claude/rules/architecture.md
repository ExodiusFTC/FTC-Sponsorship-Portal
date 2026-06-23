# Architecture

## Stack
- **Next.js 16.2** App Router, **React 19**, **Tailwind v4**, **shadcn/ui** (Radix + base-ui).
  - Next 15+ has breaking changes vs older docs. When unsure of an API, consult `node_modules/next/dist/docs/`.
- **Clerk** (`@clerk/nextjs`) — auth provider: sessions, email verification, password reset, password policy.
- **Supabase** — Postgres + Storage (no Supabase Auth). Supabase trusts Clerk via native third-party auth; security enforced primarily by database **RLS**, which reads the Clerk user id from `auth.jwt()->>'sub'`.
- **Backend** — Server Actions for all mutations (`app/actions/*`), validated with **Zod** (`lib/schemas/*`).
- **Email** — Resend + React Email (`emails/*`).
- **Errors** — Sentry (`instrumentation*.ts`).

## Directory map
- `app/(account|admin|auth|coach|public|sponsor)/` — route groups by audience (the parens are not in the URL).
- `app/actions/*.ts` — server actions: `account`, `admin`, `auth`, `moderation`, `notifications`, `sponsor-decision`, `sponsor`, `submission`, `team`.
- `app/api/*` — route handlers (return JSON; never redirected to `/login`).
- `lib/supabase/{client,server,admin,types}.ts` — Supabase clients (see auth-supabase.md). `client`/`server` forward the Clerk token via an `accessToken` callback.
- `middleware.ts` (repo root) — `clerkMiddleware()` + `createRouteMatcher` for public routes. (The old `lib/supabase/middleware.ts` was deleted.)
- `lib/schemas/*.ts` — Zod schemas (`auth`, `submission`, `team`, `sponsor`, `sponsor-signup`, `achievement`, `limits`).
- `lib/actions-utils.ts` — auth/role guards (`requireAuth`, `requireAdmin`, `requireSponsor`, `requireVerifiedCoach`) + `getClientIp`.
- `lib/notify.ts` — `createInAppNotification` + typed email senders.
- `lib/dispatch.ts` — gated sponsor outreach (`dispatchApprovedSubmission`).
- `lib/env.ts` — Zod-validated env (warns in dev, throws in prod).
- `supabase/migrations/*.sql` — numbered, idempotent migrations.
- `tests/` — Playwright E2E + `global-setup.ts`; `scripts/seed-test-accounts.mjs` for local data.

## Roles & key tables
- Roles live in `profiles.role`: **`admin`** | **`coach`** | **`sponsor`**.
- `profiles.coach_verified` (bool) — a coach must be verified before submitting pitches.
- `profiles.sponsor_id` (uuid) — links a sponsor user to their company row (null until approved).
- Core tables: `profiles`, `teams`, `submissions`, `sponsors`, `notifications`, `audit_log`, `transactions_ledger`, `submission_access_tokens`.

## Supabase clients (which one, when)
| Client | File | RLS | Use in |
|--------|------|-----|--------|
| Browser | `lib/supabase/client.ts` | respects RLS (Clerk token via `accessToken`) | Client Components |
| Server | `lib/supabase/server.ts` | respects RLS (Clerk token via `accessToken`) | Server Components, Route Handlers, reads in actions |
| Admin | `lib/supabase/admin.ts` | **BYPASSES ALL RLS** (unchanged) | server-only: `audit_log`, dispatch, trusted writes |

The server/browser clients forward the Clerk session token so RLS sees `auth.jwt()->>'sub'`. The **admin client uses the service-role key and ignores RLS** — it's UNCHANGED by the Clerk migration; never import it into client code, and only use it for operations that legitimately must bypass row security (audit logging, email dispatch, admin provisioning). Edge routing lives in the root `middleware.ts` (`clerkMiddleware()`), not a Supabase client.
