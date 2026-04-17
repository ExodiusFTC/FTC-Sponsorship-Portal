import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { env } from '@/lib/env'
import PitchDecisionEmail from '@/emails/pitch-decision-email'

const resend = new Resend(env.RESEND_API_KEY)

type Decision = 'approved' | 'rejected' | 'changes_requested'

/** Email the coach when their pitch receives a moderation decision. */
export async function sendPitchDecisionEmail(
  pitchId: string,
  decision: Decision,
  feedback?: string | null
) {
  try {
    const supabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pitch } = await (supabase as any)
      .from('pitches')
      .select('title, teams( profiles( email, full_name ) )')
      .eq('id', pitchId)
      .single()

    if (!pitch) return

    const coachEmail: string = pitch.teams?.profiles?.email
    const coachName: string = pitch.teams?.profiles?.full_name ?? 'Coach'

    if (!coachEmail) return

    const subjectMap: Record<Decision, string> = {
      approved: 'Your pitch has been approved 🎉',
      rejected: 'Update on your pitch submission',
      changes_requested: 'Changes requested on your pitch',
    }

    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: coachEmail,
      subject: subjectMap[decision],
      react: PitchDecisionEmail({
        coachName,
        pitchTitle: pitch.title,
        decision,
        feedback,
      }),
    })
  } catch (err) {
    // Non-fatal — log but don't crash the moderation action
    console.error('[notify] sendPitchDecisionEmail failed', err)
  }
}
