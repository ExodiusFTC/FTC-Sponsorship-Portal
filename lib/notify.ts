import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { env } from '@/lib/env'
import PitchDecisionEmail from '@/emails/pitch-decision-email'
import CredentialUploadAlert from '@/emails/credential-upload-alert'
import SponsorAppConfirmation from '@/emails/sponsor-app-confirmation'

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

async function resolveAdminRecipients(): Promise<string[]> {
  const fromEnv = env.ADMIN_NOTIFICATION_EMAILS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (fromEnv && fromEnv.length > 0) return fromEnv

  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('profiles')
      .select('email')
      .eq('role', 'admin')
    return ((data ?? []) as { email: string | null }[])
      .map((r) => r.email)
      .filter((e): e is string => !!e)
  } catch (err) {
    console.error('[notify] resolveAdminRecipients failed', err)
    return []
  }
}

/** Notify admins when a coach uploads (or re-uploads) credentials for review. */
export async function sendCredentialUploadAlert(args: { coachId: string }): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', args.coachId)
      .single()

    if (!profile?.email) return

    const { data: team } = await supabase
      .from('teams')
      .select('team_name')
      .eq('owner_id', args.coachId)
      .maybeSingle()

    const recipients = await resolveAdminRecipients()
    if (recipients.length === 0) {
      console.warn('[notify] sendCredentialUploadAlert: no admin recipients resolved')
      return
    }

    const reviewUrl = `${env.NEXT_PUBLIC_APP_URL}/coaches`

    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: recipients,
      subject: `Coach credential awaiting review — ${profile.full_name ?? profile.email}`,
      react: CredentialUploadAlert({
        coachName: profile.full_name ?? 'Coach',
        coachEmail: profile.email,
        teamName: team?.team_name ?? null,
        reviewUrl,
      }),
    })
  } catch (err) {
    console.error('[notify] sendCredentialUploadAlert failed', err)
  }
}

/** Confirmation email to a sponsor applicant after submitting the public form. */
export async function sendSponsorApplicationConfirmation(args: {
  contactEmail: string
  companyName: string
  contactName?: string
  proposedCapCents: number
}): Promise<void> {
  try {
    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: args.contactEmail,
      subject: `We received your sponsor application — ${args.companyName}`,
      react: SponsorAppConfirmation({
        companyName: args.companyName,
        contactName: args.contactName,
        proposedCapCents: args.proposedCapCents,
      }),
    })
  } catch (err) {
    console.error('[notify] sendSponsorApplicationConfirmation failed', err)
  }
}
