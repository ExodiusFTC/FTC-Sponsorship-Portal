# FTC Sponsorship Portal

A platform connecting verified adult FTC robotics coaches with corporate sponsors.
Coaches build a team Portfolio and submit tailored pitches; admins moderate and
gate sponsor-facing outreach; sponsors review approved pitches and fund teams under
strict capacity caps. Next.js 16 (App Router) + Clerk (auth) + Supabase (Postgres + Storage) + Resend.

## Core Mandates (never violate)
- **COPPA Compliance**: No student PII collected or exposed. Verified adult coaches only.
- **Admin-Gatekept Outreach**: Sponsor-facing **pitch dispatch** requires Admin approval via the review queue (`lib/dispatch.ts`). This gate is ONLY for outreach to sponsors. **Transactional notifications** (status changes, decisions, new-submission alerts) auto-send to BOTH the in-app inbox AND the recipient's email via `createInAppNotification` in `lib/notify.ts`. (Auth-flow emails — email verification, password reset — are owned by Clerk, separate from this path.)
- **Capacity Integrity**: Sponsor funding caps are strictly enforced. Never let a submission reserve beyond a sponsor's remaining cap.
- **Data Architecture Distinction**: Keep Global Team Data (the Portfolio — reused across pitches) strictly separate from Submission-Specific Data (custom pitch alignment, specific needs, local connection — unique per pitch).

## Detailed rules (auto-loaded)
@.claude/rules/architecture.md
@.claude/rules/auth-supabase.md
@.claude/rules/conventions.md
@.claude/rules/workflows.md

## Working here
- General-purpose commands: `/feature`, `/fix`, `/supa`, `/ship`.
- Project agents: `rls-auditor`, `action-reviewer`, `auth-flow-debugger`.
- Auth is **Clerk** (`@clerk/nextjs`); Supabase trusts Clerk via native third-party auth, and RLS keys off the Clerk user id in `auth.jwt()->>'sub'` (not `auth.uid()`). See `.claude/rules/auth-supabase.md`.
- Validate before pushing: `npm run typecheck && npm run lint`. Build uses Turbopack (`next build`); keep the `jsdom`/`cssstyle` `overrides` in `package.json`.
