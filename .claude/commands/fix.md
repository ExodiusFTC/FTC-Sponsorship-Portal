---
description: Completely fix a bug — reproduce, root-cause, fix, verify, regression-check
argument-hint: <bug description or error>
---

# /fix $ARGUMENTS

Fix a defect properly, not just symptomatically.

## Steps
1. **Reproduce.** Establish the exact failing behavior. Where practical, capture it as a failing test (Playwright E2E or Vitest) before touching source — that test becomes the regression guard.
2. **Root-cause.** Use the `superpowers:systematic-debugging` skill. Don't patch the first plausible line — trace to the real cause. For auth/session/RLS symptoms, use the `auth-flow-debugger` agent.
3. **Fix minimally.** Smallest change that addresses the root cause, matching surrounding code style and the conventions in `@.claude/rules/conventions.md`.
4. **Verify green.** Re-run the reproduction; then `npm run typecheck && npm run lint` and the relevant tests.
5. **Regression check.** Confirm the fix didn't weaken a guard: no RLS bypass, no COPPA/PII exposure, no capacity-cap violation, audit + notify still fire on affected actions. Run `action-reviewer`/`rls-auditor` if the fix touched actions or policies.

## Output
State the root cause in one or two sentences, the fix, and how you verified it. If a test was skipped or a step couldn't run, say so plainly.
