import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Webhook } from 'svix'
import { env } from '@/lib/env'

export async function POST(req: Request) {
  try {
    const payload = await req.text()
    const headers = {
      'svix-id': req.headers.get('svix-id') || '',
      'svix-timestamp': req.headers.get('svix-timestamp') || '',
      'svix-signature': req.headers.get('svix-signature') || '',
    }

    if (!env.RESEND_WEBHOOK_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        console.error('RESEND_WEBHOOK_SECRET is not configured; rejecting webhook')
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
      }
      console.warn('[resend-webhook] RESEND_WEBHOOK_SECRET unset — skipping signature check (dev only)')
    } else {
      try {
        const webhook = new Webhook(env.RESEND_WEBHOOK_SECRET)
        webhook.verify(payload, headers)
      } catch (err) {
        console.error('Webhook signature verification failed', err)
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

    let statusToSet = null
    switch (type) {
      case 'email.opened':
        statusToSet = 'opened'
        break
      case 'email.bounced':
        statusToSet = 'bounced'
        break
      case 'email.delivered':
        // We set 'sent' immediately when calling the API, so we can ignore or update if needed
        break
      default:
        // Ignore other events
        break
    }

    if (statusToSet) {
      const { error } = await supabase
        .from('submissions')
        .update({ status: statusToSet as any })
        .eq('resend_message_id', data.email_id)

      if (error) {
        console.error('Failed to update target status', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook processing error', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
