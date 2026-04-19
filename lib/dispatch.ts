import SubmissionEmail from '@/emails/submission-email'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { env } from '@/lib/env'

const resend = new Resend(env.RESEND_API_KEY)

export async function dispatchApprovedSubmission(submissionId: string, accessToken?: string) {
  const supabase = createAdminClient()

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
    console.error('[dispatch] Submission not found or missing relations')
    return { error: 'Submission not found' }
  }

  const sponsor = submission.sponsors as unknown as Record<string, unknown>
  const team = submission.teams as unknown as Record<string, unknown>
  const teamProfile = team.profiles as Record<string, string>

  const viewerUrl = accessToken
    ? `${env.NEXT_PUBLIC_APP_URL}/sponsor-view/${accessToken}`
    : null

  const subject = `Verified FTC Robotics Sponsorship Proposal: Team ${team.ftc_team_number ?? 'Incubator'} (${team.state})`

  try {
    const result = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: sponsor.contact_email as string,
      replyTo: teamProfile.email,
      subject,
      react: SubmissionEmail({
        teamName: team.team_name as string,
        ftcTeamNumber: team.ftc_team_number as number | null,
        state: team.state as string,
        taxStatus: team.tax_status as string,
        missionStatement: team.mission_statement as string | null,
        technicalSummary: team.technical_summary as string | null,
        outreachSummary: team.outreach_summary as string | null,
        financialAskCents: team.financial_ask_cents as number,
        budgetItems: team.budget_items as { label: string; qty: number; unitCostCents: number; totalCents: number }[],
        customPitchAlignment: submission.custom_pitch_alignment ?? '',
        specificNeedsStatement: submission.specific_needs_statement ?? '',
        heroImageUrl: ((team.media_urls as string[]) ?? [])[0] ?? null,
        viewerUrl,
      }),
      headers: {
        'Idempotency-Key': (await import('crypto')).createHash('sha256').update(submissionId + 'sponsor').digest('hex')
      },
      tags: [
        { name: 'submission_id', value: submission.id },
        { name: 'sponsor_id', value: sponsor.id as string },
      ],
    })

    if (result.data?.id) {
      await supabase
        .from('submissions')
        .update({ resend_message_id: result.data.id })
        .eq('id', submissionId)
    }

    if (result.error) {
      console.error('[dispatch] Failed to send email to', sponsor.contact_email, result.error)
    }
  } catch (e) {
    console.error('[dispatch] Failed to dispatch email', e)
  }
}
