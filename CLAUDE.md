# FTC Sponsorship Portal

## Core Mandates
- **COPPA Compliance**: No student PII collected/exposed. Verified adult coaches only.
- **Admin-Gatekept Outreach**: Sponsor-facing **pitch dispatch** requires Admin approval via the review queue (`lib/dispatch.ts`). This gate is only for outreach to sponsors — **transactional notifications** (status changes, decisions, new-submission alerts) auto-send to BOTH the in-app inbox and the recipient's email via `createInAppNotification` in `lib/notify.ts`.
- **Capacity Integrity**: Sponsor funding caps are strictly enforced.
- **Data Architecture Distinction**: Strictly prioritize the distinction between Global Team Data (the Portfolio) and Submission-Specific Data (custom pitch alignment, specific needs, local connection).

## Tech Stack & Architecture
- **Next.js 16.2** (App Router), React 19, Tailwind v4, shadcn/ui.
  - *Warning*: Next.js 15+ has breaking changes. Consult `node_modules/next/dist/docs/` for current API conventions.
- **Supabase** (Postgres, Auth, Storage). Security enforced via database RLS.
- **Backend**: Server Actions for all mutations (`app/actions/`), validated with Zod.
- **Email**: Resend + React Email.
- **Audit**: All sensitive admin actions append to `audit_log`.

## Commands
- Dev: `npm run dev`, `npm run build`
- Validate: `npm run lint`, `npm run typecheck`
- Test: `npx playwright test` (E2E), Vitest (Unit), pgtap (RLS).

## Deployment & Ops
- **Live**: Vercel — `https://ftc-sponsorship-portal.vercel.app` (Hobby tier). Runtime env vars live in the Vercel project, not `.env.local`.
- **Supabase keys**: use the **legacy JWT** keys (`eyJ…`, Settings → API → JWT keys). The new `sb_secret_` key is rejected (401) by this project's REST + Auth Admin API; `SUPABASE_SERVICE_ROLE_KEY` must be the legacy service_role JWT or the whole server side fails.
- **Migrations**: apply via `psql` (or `supabase db reset --linked`). The Supabase CLI's statement splitter mishandles migrations that define multiple `$$`-quoted functions in one file (0035/0041/0044/0047 → "cannot insert multiple commands into a prepared statement") — apply those with `psql -f`. Migrations are idempotent; enum values are pre-declared at type creation so a from-scratch replay works.
- **No Upstash/Redis** — rate limiting was removed entirely; do not reintroduce those env vars.
- **Build** uses webpack (`next build --webpack`), not Turbopack.
