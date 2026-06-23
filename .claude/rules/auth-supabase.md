# Auth (Clerk) & Supabase

This is the area that breaks most. Follow these patterns exactly.

Auth is **Clerk** (`@clerk/nextjs`). Supabase keeps **Postgres + Storage only** — it trusts
Clerk through native third-party auth. Email verification, password reset, sessions, and the
password policy are all owned by Clerk. RLS keys off the Clerk user id.

## Identity bridge (Clerk ↔ Supabase)
- The Clerk session token is a JWT whose `sub` claim is the Clerk user id (TEXT, like `user_2…`). In Postgres it's `auth.jwt()->>'sub'`.
- **`auth.uid()` is NULL under Clerk** — it is no longer used anywhere. Do not write policies against it.
- `profiles.id` (uuid) PK and every FK are UNCHANGED. A `profiles.clerk_user_id text unique` column maps the Clerk id → the profile row.
- SQL helper `current_profile_id()` resolves `auth.jwt()->>'sub'` → `profiles.id`. `is_admin()` and `is_coach_verified()` key off `clerk_user_id`. Defined in `supabase/migrations/0051_clerk_auth.sql`.
- Roles stay authoritative in `profiles.role`; they're mirrored into Clerk `publicMetadata.role` for UX convenience only — never trust `publicMetadata` for authorization.

## Auth guards (`lib/actions-utils.ts`)
Every server action starts by calling one of these. They throw on failure; catch and
return `{ error: e.message }`.

- `requireAuth()` → `{ supabase, user, clerkUserId }`. Throws `Unauthorized` if no Clerk session. `user` is the resolved `profiles` row; `clerkUserId` is the Clerk `sub`.
- `requireAdmin()` → `{ supabase, user, clerkUserId, adminClient }`. Throws `Forbidden` if `user.role !== 'admin'`.
- `requireSponsor()` → `{ supabase, user, clerkUserId, sponsorId, adminClient }`. Throws `Forbidden` if not `sponsor` or `sponsor_id` is null.
- `requireVerifiedCoach()` → `{ supabase, user, clerkUserId }`. Throws `Forbidden` if not `coach`; throws `Awaiting credential verification` with `e.code = 'NEEDS_VERIFICATION'` if `coach_verified` is false (callers can branch on the code to show the verification CTA).

They resolve the caller via Clerk's `auth()` (server-side) to get the `sub`, then read the matching `profiles` row (role, `coach_verified`, `sponsor_id`) by `clerk_user_id`.
**Use Clerk `auth()` (server) / `currentUser()`, never trust client-supplied ids** — `auth()` validates the session JWT against Clerk. Role and verification always come from the `profiles` row, not from Clerk metadata.

## Client selection (do not mix up)
- Mutations / trusted writes that must bypass RLS (audit log, dispatch, admin provisioning) → **admin client** (`createAdminClient()`), server-only, UNCHANGED (service-role key, bypasses RLS).
- Reads/writes that should respect the caller's permissions → **server client** (`createClient()` from `lib/supabase/server.ts`). It forwards the Clerk session token to Supabase via an `accessToken` callback (no cookie/SSR session handling), so RLS sees `auth.jwt()->>'sub'`.
- Anything in a `'use client'` component → **browser client** (`lib/supabase/client.ts`), which also forwards the Clerk token via `accessToken`.
- Never import `lib/supabase/admin.ts` into a Client Component or expose the service-role key.

## Middleware routing (root `middleware.ts`)
Routing runs through `clerkMiddleware()` with a `createRouteMatcher` public-routes list. The old
`lib/supabase/middleware.ts` (`updateSession`) was DELETED — Clerk owns session handling now.
- Public routes (allowed unauthenticated): `/`, `/legal/*`, `/sponsors/apply`, `/sponsor-view/*`, plus the Clerk-handled `/login` and `/signup`.
- Auth pages (`/login`, `/signup`, `/verify-email`): authed users are sent to `/dashboard`.
- Everything else: unauthenticated → redirect to `/login`.
- **API routes are never redirected** — unauth `/api/*` returns JSON `401`/`403` (e.g. `/api/admin` rejected at the edge). Don't add UI redirects for API paths.
- When adding a new public/unauthenticated page, add it to the `createRouteMatcher` list in `middleware.ts` or it will bounce to `/login`.

## Auth routes (`app/(auth)/`)
`login` (Clerk `useSignIn()`) · `signup` (multi-step coach wizard + file upload, Clerk headless `useSignUp()` with inline email-code verification) · `verify-email` · `upload-credentials` (coach photo ID) · `awaiting-verification`.

Profile creation runs **after** the Clerk session is active, via server actions in `app/actions/auth.ts`: `createCoachProfile(formData)` and `createSponsorApplication(data)`. There is no `signUp`/`signIn`/`signOut`/`forgotPassword`/`resetPassword` action anymore — Clerk owns those. A Clerk webhook at `app/api/webhooks/clerk/route.ts` handles `user.deleted` and email sync. DELETED: `app/auth/callback/route.ts`, `app/(auth)/forgot-password`, `app/(auth)/reset-password`.

## RLS authoring checklist (when adding/altering tables)
1. `ENABLE ROW LEVEL SECURITY` on every new table.
2. Write explicit policies per role. Resolve the caller with `current_profile_id()` (or compare `clerk_user_id = auth.jwt()->>'sub'`), **never `auth.uid()`** (it's NULL under Clerk). Use `is_admin()` / `is_coach_verified()` for role gating.
3. A user must only see their own rows + legitimately public rows. Sponsors must NOT see other sponsors' data; coaches must NOT see other teams' submission-specific data.
4. If a server operation legitimately needs to cross rows (audit, dispatch, admin views), route it through the admin client rather than loosening a policy.
5. Re-check capacity-cap and COPPA implications: no student PII columns exposed to non-admins.
6. Audit with the `rls-auditor` agent or `/supa` after writing policies — it flags any lingering `auth.uid()`.

## Storage
Files partition by the Clerk user id: the first path segment must equal `auth.jwt()->>'sub'`. Storage RLS is written against that segment. Buckets are unchanged.

## MFA
MFA was **fully removed** (the `app/(auth)/mfa` page, `mfa-setup-panel`, `mfa-challenge-form`, and admin security page are deleted). Auth is email + password via Clerk only. **Do not reintroduce MFA** unless explicitly asked.
