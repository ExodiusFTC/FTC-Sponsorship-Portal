# Conventions

## Canonical server action shape (`app/actions/*.ts`)
Every mutating action follows these 5 steps. Missing any of steps 1, 2, 4, or 5 on a
sensitive action is a bug.

```ts
'use server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/actions-utils'        // or requireAuth / requireSponsor / requireVerifiedCoach
import { createInAppNotification } from '@/lib/notify'

const inputSchema = z.object({ /* ... */ })

export async function doThing(data: z.input<typeof inputSchema>) {
  // 1. VALIDATE
  const parsed = inputSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Validation failed: ' + parsed.error.issues.map(i => i.message).join(', ') }
  }

  // 2. AUTH / ROLE
  let user, supabase, adminClient
  try {
    ({ user, supabase, adminClient } = await requireAdmin())
  } catch (e: any) {
    return { error: e.message }   // surface NEEDS_VERIFICATION code where relevant
  }

  // 3. MUTATE (server client respects RLS; admin client bypasses it)
  const { data: row, error } = await supabase.from('table').insert({ /* ... */ }).select().single()
  if (error) return { error: error.message }

  // 4. AUDIT (always via admin client — audit_log is RLS-protected)
  await adminClient.from('audit_log').insert({
    actor_id: user.id, action: 'do_thing', entity_type: 'table', entity_id: row.id, metadata: { /* ... */ },
  })

  // 5. NOTIFY (in-app + email unless a richer dedicated email is sent)
  await createInAppNotification({ recipientId: row.owner_id, type: 'general', title: '...', body: '...' })

  return { success: true }
}
```

Reference implementations: `app/actions/submission.ts`, `app/actions/admin.ts`, `app/actions/moderation.ts`, `app/actions/auth.ts`.

## Zod schemas (`lib/schemas/*`)
- Always `safeParse` in the action, never `parse`. Return the joined issue messages on failure.
- Reuse field helpers: `plainTextField(min,max,...)` (HTML→plain text via `htmlToPlainText`) in `submission.ts`; `richTextField(min,max,...)` (DOMPurify-sanitized) in `team.ts`. `min = null` means optional.
- Max lengths live in `lib/schemas/limits.ts` — reference those constants, don't hardcode.
- Passwords: enforced by **Clerk** (12+ chars with upper/lower/number, set in the Clerk dashboard), not by a Zod password schema. Coach/sponsor profile creation (`createCoachProfile` / `createSponsorApplication` in `app/actions/auth.ts`, run after the Clerk session is active) still require `coppaAcknowledged`, `tosAccepted`, `ageConfirmed` (and DOB ≥ 18 for coaches) via Zod.

## Notifications & dispatch
- `createInAppNotification({ recipientId, type, title, body?, submissionId?, skipEmail? })` — `type` ∈ `submission_approved | submission_declined | submission_changes_requested | coach_verified | general`. Inserts into `notifications` AND emails the recipient. Set `skipEmail: true` ONLY when the action already sends a richer dedicated email (see `lib/notify.ts` senders).
- Sponsor-facing **outreach** goes exclusively through `dispatchApprovedSubmission` in `lib/dispatch.ts` (Resend + `idempotencyKey` to prevent double-sends; stores `resend_message_id`). Never email a sponsor a pitch outside this gated path.

## Audit
Every sensitive admin/mutating action appends to `audit_log` via the admin client:
`{ actor_id, action, entity_type, entity_id, metadata }`.

## Core Mandate reminders (inline)
- COPPA: never add columns/queries/UI that expose student PII to non-admins.
- Capacity: before reserving against a sponsor, check remaining cap (`submission.ts` pattern + `0047_reserve_at_approval`).
- Portfolio vs Submission: global team facts belong on `teams`; per-pitch fields (alignment, needs, local connection) belong on `submissions`. Don't duplicate global data into submissions.
