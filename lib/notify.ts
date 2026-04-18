import SubmissionDecisionEmail from '@/emails/submission-decision-email'
import CredentialUploadAlert from '@/emails/credential-upload-alert'
import SponsorAppConfirmation from '@/emails/sponsor-app-confirmation'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

const resend = new Resend(env.RESEND_API_KEY)

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

    const coachEmail: string = (submission.teams as any)?.profiles?.email
    const coachName: string = (submission.teams as any)?.profiles?.full_name ?? 'Coach'

    const config = {
      approved: 'Your submission has been approved 🎉',
      declined: 'Update on your submission',
      changes_requested: 'Changes requested on your submission',
    }

    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: coachEmail,
      subject: config[decision],
      react: SubmissionDecisionEmail({
        submissionTitle: `Submission to ${(submission.sponsors as any)?.company_name}`,
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
  coachId: string,
  coachName: string,
  coachEmail: string
) {
  try {
    // We send this to our own from address or a configured admin list
    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: env.RESEND_FROM_EMAIL, 
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
