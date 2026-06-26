---
description: Pre-push gate — typecheck, lint, build, tests, then open a PR
argument-hint: [PR title]
---

# /ship $ARGUMENTS

Catch what breaks before Vercel does, then open a PR.

## Steps
1. **Typecheck** — `npm run typecheck`. Fix errors before continuing.
2. **Lint** — `npm run lint`.
3. **Build** — `npm run build` (Turbopack). This catches Next 16 / RSC issues `tsc` misses.
4. **Tests** — `npm run test` (Vitest) and, if relevant to the change, `npx playwright test`.
5. **PR** — only if all green and the user wants to push:
   - If on `main`, create a branch first.
   - Commit (end the message with the required Co-Authored-By line), push, and open a PR with `gh`.
   - PR body ends with the required Generated-with line.

## Rules
- Do not commit or push unless the user asked. Report results faithfully — if a step fails, show the output and stop; don't open a PR on red.
