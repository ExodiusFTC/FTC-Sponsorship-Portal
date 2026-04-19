'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendHandshakeEmail } from '@/lib/notify'

type DecisionType = 'decline' | 'full' | 'partial'

interface AccessTokenRow {
  id: string
  submission_id: string
  expires_at: string
  used_at: string | null
  submissions: {
    id: string
    sponsor_id: string
    team_id: string
    [key: string]: unknown
  }
}

export async function recordSponsorDecision(
  token: string,
  decision: DecisionType,
  partialAmountCents?: number
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as unknown as any

  // Resolve and validate token
  const { createHash } = await import('crypto')
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const { data: accessToken, error: tokenError } = await db
    .from('submission_access_tokens')
    .select('*, submissions:submission_id(*)')
    .eq('token_hash', tokenHash)
    .single()

  if (tokenError || !accessToken) {
    return { ok: false, error: 'Invalid or expired link.' }
  }

  const row = accessToken as AccessTokenRow

  if (new Date(row.expires_at) < new Date()) {
    return { ok: false, error: 'This proposal link has expired.' }
  }
  if (row.used_at) {
    return { ok: false, error: 'A decision has already been recorded for this proposal.' }
  }

  const submissionId = row.submissions.id
  const sponsorId = row.submissions.sponsor_id
  const teamId = row.submissions.team_id

  // Mark token as used
  await db
    .from('submission_access_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)

  if (decision === 'decline') {
    await supabase
      .from('submissions')
      .update({ 
        status: 'declined',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', submissionId)

    await supabase.from('audit_log').insert({
      actor_id: null,
      action: 'sponsor_decline',
      entity_type: 'submissions',
      entity_id: submissionId,
      metadata: { sponsor_id: sponsorId },
    })

    return { ok: true }
  }

  // Accept (full or partial) — debit sponsor budget
  const { data: team } = await supabase
    .from('teams')
    .select('financial_ask_cents')
    .eq('id', teamId)
    .single()

  const { data: sponsor } = await supabase
    .from('sponsors')
    .select('funding_used_cents, funding_cap_cents')
    .eq('id', sponsorId)
    .single()

  if (!team || !sponsor) return { ok: false, error: 'Data integrity error.' }

  const askCents = team.financial_ask_cents as number
  const usedCents = sponsor.funding_used_cents as number
  const capCents = sponsor.funding_cap_cents as number

  const amountCents =
    decision === 'partial' && partialAmountCents && partialAmountCents > 0
      ? partialAmountCents
      : askCents

  if (usedCents + amountCents > capCents) {
    return { ok: false, error: 'Sponsor capacity has been exceeded. Please contact us.' }
  }

  // Update submission status
  await supabase
    .from('submissions')
    .update({ 
      status: 'approved',
      reviewed_at: new Date().toISOString()
    })
    .eq('id', submissionId)

  // Debit sponsor; auto-inactivate at cap
  const newUsed = usedCents + amountCents
  await supabase
    .from('sponsors')
    .update({
      funding_used_cents: newUsed,
      ...(newUsed >= capCents ? { status: 'inactive' as const } : {}),
    })
    .eq('id', sponsorId)

  // Ledger entry (new table — bypass type generation)
  await db.from('transactions_ledger').insert({
    sponsor_id: sponsorId,
    team_id: teamId,
    submission_id: submissionId,
    amount_cents: amountCents,
    decision_type: decision,
    actor_type: 'sponsor',
  })

  // Audit log
  await supabase.from('audit_log').insert({
    actor_id: null,
    action: 'sponsor_accept',
    entity_type: 'submissions',
    entity_id: submissionId,
    metadata: { sponsor_id: sponsorId, amount_cents: amountCents, decision_type: decision },
  })

  // Handshake email to both parties
  await sendHandshakeEmail(submissionId, amountCents)

  return { ok: true }
}
