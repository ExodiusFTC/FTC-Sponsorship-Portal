import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { ModerationQueue } from '@/components/admin/moderation-queue'

export const dynamic = 'force-dynamic'

export default async function ModerationPage() {
  const supabase = await createClient()

  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      id,
      updated_at,
      requested_amount_cents,
      custom_pitch_alignment,
      specific_needs_statement,
      teams:team_id (
        team_name,
        ftc_team_number,
        state,
        status,
        mission_statement,
        technical_summary,
        outreach_summary,
        financial_ask_cents,
        budget_items
      ),
      sponsors:sponsor_id (
        company_name
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Review Queue"
        subtitle="Review submitted portfolios and custom pitches. Approved submissions are dispatched to sponsors with a secure 14-day token link."
      />
      <ModerationQueue initialSubmissions={submissions ?? []} />
    </div>
  )
}
