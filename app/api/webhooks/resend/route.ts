import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Webhook } from 'svix'
import { env } from '@/lib/env'
import { globalLimiter } from '@/lib/rate-limit'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'

const resendWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    email_id: z.string(),
    tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
  }),
})

const EVENT_STATUS_MAP: Record<string, string> = {
  'email.bounced': 'bounced',
  'email.delivered': 'delivered',
  'email.opened': 'opened',
}

export async function POST(req: Request) {
  if (globalLimiter) {
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const { success } = await globalLimiter.limit(`webhook_resend_${ip}`)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  try {
    const payload = await req.text()
    const svixHeaders = {
      'svix-id': req.headers.get('svix-id') || '',
      'svix-timestamp': req.headers.get('svix-timestamp') || '',
      'svix-signature': req.headers.get('svix-signature') || '',
    }

    if (!env.RESEND_WEBHOOK_SECRET) {
      if (process.env.NODE_ENV !== 'development') {
        const err = new Error('RESEND_WEBHOOK_SECRET is not configured')
        console.error(err.message)
        Sentry.captureException(err)
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
      }
      console.warn('[resend-webhook] RESEND_WEBHOOK_SECRET unset — skipping signature check (dev only)')
    } else {
      try {
        const webhook = new Webhook(env.RESEND_WEBHOOK_SECRET)
        webhook.verify(payload, svixHeaders)
      } catch (err) {
        console.error('Webhook signature verification failed', err)
        Sentry.captureException(err)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    }

    const json = JSON.parse(payload)
    const result = resendWebhookSchema.safeParse(json)

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload format' }, { status: 400 })
    }

    const { type, data } = result.data
    const newStatus = EVENT_STATUS_MAP[type]

    // Only process events we care about
    if (!newStatus) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const supabase = createAdminClient()

    // Primary lookup: resend_message_id stored at dispatch time
    let submissionId: string | null = null
    const { data: byMessageId } = await supabase
      .from('submissions')
      .select('id')
      .eq('resend_message_id', data.email_id)
      .maybeSingle()

    submissionId = byMessageId?.id ?? null

    // Fallback: use submission_id tag injected by dispatch.ts
    if (!submissionId && data.tags) {
      const tag = data.tags.find((t) => t.name === 'submission_id')
      if (tag?.value) submissionId = tag.value
    }

    if (!submissionId) {
      console.warn('[resend-webhook] No submission found for email_id', data.email_id)
      return NextResponse.json({ success: true, matched: false })
    }

    // Idempotency: svix retries deliver the same (email_id, type) repeatedly. If we have
    // already recorded this exact event, skip — never double-process or append dup audit rows.
    const { data: alreadyProcessed } = await supabase
      .from('audit_log')
      .select('id')
      .eq('action', `resend_webhook_${type}`)
      .eq('entity_id', submissionId)
      .contains('metadata', { resend_email_id: data.email_id })
      .maybeSingle()

    if (alreadyProcessed) {
      return NextResponse.json({ success: true, duplicate: true })
    }

    if (type === 'email.bounced') {
      // A bounce releases the reservation back to the sponsor's cap — but the RPC is
      // guarded to live states only, so it can NEVER revert a funded ('approved') deal. (C-1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('release_submission_reservation', {
        p_submission_id: submissionId,
        p_new_status: 'bounced',
        p_reason: 'email_bounced',
      })
    } else {
      // delivered / opened are tracking-only; guard so a late event never overwrites a
      // terminal state (approved / declined / expired / bounced / changes_requested).
      await supabase
        .from('submissions')
        .update({ status: newStatus as never })
        .eq('id', submissionId)
        .in('status', ['dispatched', 'delivered', 'opened'])
    }

    await supabase.from('audit_log').insert({
      actor_id: null,
      action: `resend_webhook_${type}`,
      entity_type: 'submissions',
      entity_id: submissionId,
      metadata: { resend_email_id: data.email_id, webhook_type: type, new_status: newStatus },
    })

    return NextResponse.json({ success: true, matched: true, status: newStatus })
  } catch (error) {
    console.error('Webhook processing error', error)
    Sentry.captureException(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
