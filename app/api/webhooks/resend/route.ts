import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Webhook } from 'svix'
import { env } from '@/lib/env'
import * as Sentry from '@sentry/nextjs'

export async function POST(req: Request) {
  try {
    const payload = await req.text()
    const headers = {
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
        webhook.verify(payload, headers)
      } catch (err) {
        console.error('Webhook signature verification failed', err)
        Sentry.captureException(err)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    }

    const body = JSON.parse(payload)
    const supabase = createAdminClient()

    // Resend webhook format: { type: 'email.opened', data: { email_id: '...' } }
    const { type, data } = body

    if (!data || !data.email_id) {
      return NextResponse.json({ error: 'Missing email_id' }, { status: 400 })
    }

    const { data: submission } = await supabase
      .from('submissions')
      .select('id')
      .eq('resend_message_id', data.email_id)
      .maybeSingle()

    if (submission?.id) {
      await supabase.from('audit_log').insert({
        actor_id: null,
        action: `resend_webhook_${type}`,
        entity_type: 'submissions',
        entity_id: submission.id,
        metadata: { resend_email_id: data.email_id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook processing error', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
