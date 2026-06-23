---
description: Add a feature end-to-end (schema → action → UI → tests), respecting Core Mandates
argument-hint: <what to build>
---

# /feature $ARGUMENTS

Add a new feature to the FTC Sponsorship Portal, end to end and mandate-safe.

## Steps
1. **Understand & scope.** Restate the feature in one line. If the intent or UX is unclear, ask. For non-trivial features, use the `superpowers:brainstorming` skill before writing code. Identify which audience(s) it touches: admin / coach / sponsor / public.
2. **Data layer.** If new tables/columns are needed, write a numbered idempotent migration in `supabase/migrations/` with RLS enabled and per-role policies (see `@.claude/rules/auth-supabase.md` checklist). Apply via `psql -f`.
3. **Validation.** Add/extend a Zod schema in `lib/schemas/`, reusing `plainTextField`/`richTextField` and the `limits.ts` constants.
4. **Server action.** Implement in `app/actions/` following the canonical 5-step shape (`@.claude/rules/conventions.md`): `safeParse` → `requireXxx()` → mutate → `audit_log` (admin client) → `createInAppNotification`. Use the right Supabase client.
5. **UI.** Build with shadcn/ui + Tailwind v4 in the correct `app/(role)/` route group. Wire the action; show validation errors and the `NEEDS_VERIFICATION` branch where relevant.
6. **Tests.** Add/extend a Playwright E2E covering the happy path + an authz negative (wrong role blocked). Seed with `scripts/seed-test-accounts.mjs` if needed.
7. **Review & verify.** Run the `action-reviewer` agent on new actions and `rls-auditor` on new tables. Then `npm run typecheck && npm run lint`.

## Guardrails
- COPPA: no student PII exposed to non-admins.
- Capacity caps strictly enforced; reserve only within remaining cap.
- Keep Global Portfolio data (`teams`) separate from Submission-specific data (`submissions`).
- Sponsor outreach only via `lib/dispatch.ts`; transactional notifies via `createInAppNotification`.
