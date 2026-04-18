import SubmissionEmail from '@/emails/submission-email'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

const resend = new Resend(env.RESEND_API_KEY)

export async function dispatchApprovedSubmission(submissionId: string) {
  const supabase = await createClient()

  // 1. Fetch submission, team, and targets
  const { data: submission } = await supabase
    .from('submissions')
    .select(`
      *,
      teams:team_id (
        *,
        profiles:owner_id (email, full_name)
      ),
      sponsors:sponsor_id (
        *
      )
    `)
    .eq('id', submissionId)
    .single()

  if (!submission || !submission.sponsors || !submission.teams) {
    console.error('Submission not found or missing relations')
    return { error: 'Submission not found' }
  }

  const sponsor = submission.sponsors as any
  const team = submission.teams as any

  // 2. Dispatch email to sponsor
  try {
      const result = await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: sponsor.contact_email,
        replyTo: team.profiles.email,
        subject: `Sponsorship Opportunity: ${team.team_name}`,
        react: SubmissionEmail({
          teamName: team.team_name,
          missionStatement: team.mission_statement,
          technicalSummary: team.technical_summary,
          outreachSummary: team.outreach_summary,
          financialAskCents: team.financial_ask_cents,
          budgetItems: team.budget_items as any,
          customPitchAlignment: submission.custom_pitch_alignment || '',
          specificNeedsStatement: submission.specific_needs_statement || '',
        }),
        tags: [
          { name: 'submission_id', value: submission.id },
          { name: 'sponsor_id', value: sponsor.id },
        ],
      })

      if (result.data?.id) {
        await supabase
          .from('submissions')
          .update({ resend_message_id: result.data.id })
          .eq('id', submissionId)
      }

      if (result.error) {
        console.error('Failed to send email to', sponsor.contact_email, result.error)
      }
  } catch (e) {
    console.error('Failed to dispatch email', e)
  }
}
