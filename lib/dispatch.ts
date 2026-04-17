import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { env } from '@/lib/env'

const resend = new Resend(env.RESEND_API_KEY)

export async function dispatchApprovedPitch(pitchId: string) {
  const supabase = createAdminClient()

  // 1. Fetch pitch, team, and targets
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pitch } = await (supabase as any)
    .from('pitches')
    .select(`
      *,
      teams (
        *,
        profiles ( email )
      ),
      pitch_sponsor_targets (
        id, sponsor_id, sponsors ( contact_email, contact_name, company_name )
      )
    `)
    .eq('id', pitchId)
    .single()

  if (!pitch || !pitch.pitch_sponsor_targets || pitch.pitch_sponsor_targets.length === 0) {
    console.error('Pitch not found or no targets available')
    return false
  }

  // 2. Prepare emails (batch)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const targets = pitch.pitch_sponsor_targets as any[]
  
  for (const target of targets) {
    try {
      const { data, error } = await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: target.sponsors.contact_email,
        replyTo: pitch.teams.profiles.email,
        subject: `Sponsorship Opportunity: ${pitch.teams.team_name} - ${pitch.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hello ${target.sponsors.contact_name},</h2>
            <p>We are reaching out from <strong>${pitch.teams.team_name}</strong> with a sponsorship opportunity.</p>
            
            <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>${pitch.title}</h3>
              <p>${pitch.summary}</p>
              
              <h4>Financial Ask: $${(pitch.financial_ask_cents / 100).toFixed(2)}</h4>
              <p>${pitch.cost_explanation}</p>
            </div>
            
            <p>If you are interested in discussing this further, please reply directly to this email to connect with our team coach.</p>
            <p>Best regards,<br/>The ${pitch.teams.team_name} Team</p>
          </div>
        `,
        tags: [
          { name: 'pitch_id', value: pitch.id },
          { name: 'sponsor_id', value: target.sponsor_id },
          { name: 'target_id', value: target.id }
        ],
      })

      if (error) {
        console.error('Error sending email to', target.sponsors.contact_email, error)
        await supabase
          .from('pitch_sponsor_targets')
          .update({ dispatch_status: 'failed' })
          .eq('id', target.id)
      } else {
        await supabase
          .from('pitch_sponsor_targets')
          .update({ 
            dispatch_status: 'sent',
            resend_message_id: data?.id,
            sent_at: new Date().toISOString()
          })
          .eq('id', target.id)
      }
    } catch (e) {
      console.error('Exception during email dispatch', e)
    }
  }

  // Update pitch status to dispatched
  await supabase
    .from('pitches')
    .update({ status: 'dispatched' })
    .eq('id', pitchId)

  return true
}
