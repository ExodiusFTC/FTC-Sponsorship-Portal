import SubmissionDecisionEmail from '@/emails/submission-decision-email'
import CredentialUploadAlert from '@/emails/credential-upload-alert'
import SponsorAppConfirmation from '@/emails/sponsor-app-confirmation'
import HandshakeEmail from '@/emails/handshake-email'
import CoachVerificationEmail from '@/emails/coach-verification-email'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { env } from '@/lib/env'

const resend = new Resend(env.RESEND_API_KEY)

async function getAdminNotificationRecipients() {
  const configured = env.ADMIN_NOTIFICATION_EMAILS
    ?.split(',')
    .map((email) => email.trim())
    .filter(Boolean)

  if (configured && configured.length > 0) {
    return configured
  }

  const supabase = createAdminClient()
  const { data: admins } = await supabase
    .from('profiles')
    .select('email')
    .eq('role', 'admin')

  return (admins || [])
    .map((a) => a.email)
    .filter((email): email is string => Boolean(email))
}

/** Email the coach when their submission receives a moderation decision. */
export async function sendSubmissionDecisionEmail(
  submissionId: string,
  decision: 'approved' | 'declined' | 'changes_requested',
  feedback?: string
) {
  try {
    const supabase = await createClient()
    const { data: submission } = await supabase
      .from('submissions')
      .select('*, teams:team_id(profiles:owner_id(email, full_name)), sponsors:sponsor_id(company_name)')
      .eq('id', submissionId)
      .single()

    if (!submission) return

    const team = submission.teams as { profiles?: { email?: string; full_name?: string } } | null
    const sponsor = submission.sponsors as { company_name?: string } | null
    const coachEmail = team?.profiles?.email
    const coachName = team?.profiles?.full_name ?? 'Coach'

    const config = {
      approved: 'Your submission has been approved 🎉',
      declined: 'Update on your submission',
      changes_requested: 'Changes requested on your submission',
    }

    if (!coachEmail) return

    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: coachEmail,
      subject: config[decision],
      react: SubmissionDecisionEmail({
        submissionTitle: `Submission to ${sponsor?.company_name ?? 'Sponsor'}`,
        coachName,
        decision,
        feedback,
      }),
    })
  } catch (err) {
    console.error('[notify] sendSubmissionDecisionEmail failed', err)
  }
}

/** Alert admins when a new coach has uploaded their credentials. */
export async function sendCredentialUploadAlert(
  _coachId: string,
  coachName: string,
  coachEmail: string
) {
  try {
    const recipients = await getAdminNotificationRecipients()
    if (recipients.length === 0) return

    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: recipients,
      subject: `Action Required: New Coach Credentials (${coachName})`,
      react: CredentialUploadAlert({
        coachName,
        coachEmail,
        reviewUrl: `${env.NEXT_PUBLIC_APP_URL}/analytics`, // Analytics page has the pending list
      }),
    })
  } catch (err) {
    console.error('[notify] sendCredentialUploadAlert failed', err)
  }
}

/** Send "Match Made" emails to both sponsor and coach after an acceptance. */
export async function sendHandshakeEmail(submissionId: string, amountCents: number) {
  try {
    const supabase = createAdminClient()
    const { data: submission } = await supabase
      .from('submissions')
      .select(`
        *,
        teams:team_id (
          team_name, ftc_team_number,
          profiles:owner_id (email, full_name)
        ),
        sponsors:sponsor_id (company_name, contact_email, contact_name)
      `)
      .eq('id', submissionId)
      .single()

    if (!submission) return

    const team = submission.teams as unknown as Record<string, unknown>
    const sponsor = submission.sponsors as unknown as Record<string, unknown>
    const coachProfile = team.profiles as Record<string, string>

    const shared = {
      sponsorName: sponsor.company_name as string,
      teamName: team.team_name as string,
      ftcTeamNumber: team.ftc_team_number as number | null,
      amountCents,
      coachEmail: coachProfile.email,
    }

    await Promise.all([
      // To coach
      resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: coachProfile.email,
        subject: `Match Made! ${sponsor.company_name} will sponsor your team for $${(amountCents / 100).toFixed(2)}`,
        react: HandshakeEmail({ ...shared, recipientName: coachProfile.full_name ?? 'Coach', isSponsor: false }),
        headers: {
          'Idempotency-Key': (await import('crypto')).createHash('sha256').update(submissionId + 'handshake-coach').digest('hex')
        }
      }),
      // To sponsor
      resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: sponsor.contact_email as string,
        subject: `Match Made! You're sponsoring ${team.team_name} for $${(amountCents / 100).toFixed(2)}`,
        react: HandshakeEmail({ ...shared, recipientName: sponsor.contact_name as string ?? 'Sponsor', isSponsor: true }),
        headers: {
          'Idempotency-Key': (await import('crypto')).createHash('sha256').update(submissionId + 'handshake-sponsor').digest('hex')
        }
      }),
    ])
  } catch (err) {
    console.error('[notify] sendHandshakeEmail failed', err)
  }
}

/** Confirm to a sponsor that we received their application. */
export async function sendSponsorApplicationConfirmation(
  companyName: string,
  contactEmail: string,
  contactName: string,
  proposedCapCents: number
) {
  try {
    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: contactEmail,
      subject: 'We received your sponsor application',
      react: SponsorAppConfirmation({
        companyName,
        contactName,
        proposedCapCents,
      }),
    })
  } catch (err) {
    console.error('[notify] sendSponsorApplicationConfirmation failed', err)
  }
}

export async function createInAppNotification({
  recipientId, type, title, body, submissionId,
}: {
  recipientId: string
  type: 'submission_declined' | 'submission_approved' | 'submission_changes_requested' | 'coach_verified' | 'general'
  title: string
  body?: string
  submissionId?: string
}) {
  try {
    const supabase = createAdminClient()
    await supabase.from('notifications').insert({
      recipient_id: recipientId,
      type, title, body: body ?? null, submission_id: submissionId ?? null,
    })
  } catch (err) {
    console.error('[notify] createInAppNotification failed', err)
  }
}

/** Send a congratulations email when an admin verifies a coach's credentials. */
export async function sendCoachVerificationEmail(coachId: string, coachName: string) {
  try {
    const supabase = createAdminClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', coachId)
      .single()
    if (!profile?.email) return

    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: profile.email,
      subject: 'Your Matchmaker coach account has been verified 🎉',
      react: CoachVerificationEmail({ coachName }),
    })
  } catch (err) {
    console.error('[notify] sendCoachVerificationEmail failed', err)
  }
}
