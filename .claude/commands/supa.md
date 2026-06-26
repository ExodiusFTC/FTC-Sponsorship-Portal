---
description: Supabase helper — auth/login/session, RLS policies, migrations
argument-hint: <auth issue | table/feature | migration to write>
---

# /supa $ARGUMENTS

One command for the Supabase/auth work that's easy to get wrong. Read
`@.claude/rules/auth-supabase.md` first. Figure out which mode applies:

## Mode A — Auth / login / session issue
- Use the `auth-flow-debugger` agent.
- Check: server vs browser vs admin client confusion; redirect loops (is the route in the `createRouteMatcher` public list in `middleware.ts`?); `requireXxx` guard returning the right error (incl. `NEEDS_VERIFICATION`); API routes returning JSON 401/403 not redirecting. (Note: `lib/supabase/middleware.ts` was deleted — session handling is Clerk's `clerkMiddleware()` in root `middleware.ts`.)
- Remember: MFA is removed — do not reintroduce it.

## Mode B — RLS policy authoring / audit
- Use the `rls-auditor` agent on the affected table/feature.
- Enable RLS on every table; per-role policies for admin/coach/sponsor; sponsors never see other sponsors' rows; coaches never see other teams' submission-specific data; no student PII to non-admins.
- If a server op must cross rows, route through the admin client instead of loosening a policy.

## Mode C — Write a migration
- Create the next numbered file in `supabase/migrations/`.
- Idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`, pre-declare enum values at type creation).
- Apply with `psql -f` — NOT the Supabase CLI for files with multiple `$$`-quoted functions (splitter bug).
- New table ⇒ enable RLS + policies (Mode B checklist).

Always finish by running `npm run typecheck` and, for schema changes, applying + sanity-querying the migration.
