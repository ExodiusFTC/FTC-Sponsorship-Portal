import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
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
        .from('pitch_sponsor_targets')
        .update({ dispatch_status: statusToSet as any })
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
