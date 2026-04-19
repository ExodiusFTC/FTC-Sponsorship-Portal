'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendHandshakeEmail } from '@/lib/notify'

type DecisionType = 'decline' | 'full' | 'partial'

export async function recordSponsorDecision(
  token: string,
  decision: DecisionType,
  partialAmountCents?: number
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()

  // 1. Hash the token
  const { createHash } = await import('crypto')
  const tokenHash = createHash('sha256').update(token).digest('hex')

  // 2. Atomic RPC call
  const { data: rpcResult, error: rpcError } = await supabase.rpc('record_sponsor_decision_atomic', {
    p_token_hash: tokenHash,
    p_decision: decision,
    p_partial_amount_cents: partialAmountCents || 0
  })

  if (rpcError) return { ok: false, error: rpcError.message }

  const result = rpcResult as { ok: boolean; error?: string; amount_cents?: number }
  if (!result.ok) {
    const messages: Record<string, string> = {
      invalid_token: 'Invalid or expired link.',
      token_expired: 'This proposal link has expired.',
      token_used: 'A decision has already been recorded for this proposal.',
      insufficient_capacity: 'Sponsor capacity has been exceeded. Please contact us.'
    }
    return { ok: false, error: messages[result.error ?? ''] ?? result.error }
  }

  // 3. Success — Fetch submission ID for handshake email (RPC result only gives amount)
  const { data: tokenRow } = await supabase
    .from('submission_access_tokens')
    .select('submission_id')
    .eq('token_hash', tokenHash)
    .single()

  if (tokenRow && (decision === 'full' || decision === 'partial')) {
    // Dispatch email asynchronously (or background)
    await sendHandshakeEmail(tokenRow.submission_id, result.amount_cents || 0)
  }

  return { ok: true }
}
