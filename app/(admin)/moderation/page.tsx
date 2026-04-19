import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { ModerationActions } from '@/components/admin/moderation-actions'
import { PageHeader } from '@/components/page-header'

export default async function ModerationPage() {
  const supabase = await createClient()

  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      teams:team_id (
        team_name,
        ftc_team_number,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <PageHeader
        title="Review Queue"
        subtitle="Review submitted portfolios and custom pitches. Approved submissions will be dispatched to sponsors."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {submissions?.map((submission) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const team = (submission.teams as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sponsor = (submission.sponsors as any)
          const budgetItemsArr = (team?.budget_items as { total_cents?: number }[]) ?? []
          const lineItemSum = budgetItemsArr.reduce((sum, item) => sum + (item.total_cents ?? 0), 0)
          const financialAsk = submission.requested_amount_cents || team?.financial_ask_cents || 0
          const isOverAsk = financialAsk > lineItemSum && lineItemSum > 0

          return (
            <Card key={submission.id}>
              <CardHeader>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <CardTitle style={{ fontSize: '20px' }}>Submission to {sponsor?.company_name}</CardTitle>
                    <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginTop: '4px' }}>
                      From: {team?.team_name}{' '}
                      {team?.status === 'existing' && team?.ftc_team_number ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                          #{team.ftc_team_number}
                        </span>
                      ) : (
                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>(Incubator)</span>
                      )}
                    </p>
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '9999px',
                        padding: '2px 8px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                      }} suppressHydrationWarning>
                        Ask: ${(financialAsk / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      {isOverAsk && (
                        <span style={{ background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', borderRadius: '9999px', padding: '2px 8px', fontSize: '12px', fontWeight: 500 }}>
                          ⚠ Ask (${(financialAsk / 100).toFixed(2)}) exceeds line items (${(lineItemSum / 100).toFixed(2)})
                        </span>
                      )}
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }} suppressHydrationWarning>
                        Submitted: {new Date(submission.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px' }}>
                    <div>
                      <h4 style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-muted)', marginBottom: '8px' }}>Custom Pitch Alignment</h4>
                      <p style={{ fontSize: '14px', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '6px', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{submission.custom_pitch_alignment}</p>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-muted)', marginBottom: '8px' }}>Specific Needs Statement</h4>
                      <p style={{ fontSize: '14px', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '6px', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{submission.specific_needs_statement}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Master Portfolio Data</h3>
                    <div>
                      <h4 style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-muted)', marginBottom: '4px' }}>Mission Statement</h4>
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{team?.mission_statement}</p>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-muted)', marginBottom: '4px' }}>Technical Summary</h4>
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{team?.technical_summary}</p>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-muted)', marginBottom: '4px' }}>Outreach Summary</h4>
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{team?.outreach_summary}</p>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text-muted)', marginBottom: '8px' }}>Budget Items</h4>
                      <ul style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(team?.budget_items as any[])?.map((item, idx) => (
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: idx < (team?.budget_items as any[]).length - 1 ? '1px solid var(--border-color)' : 'none', paddingBottom: '4px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{item.qty}x {item.label}</span>
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>${(item.total_cents / 100).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
              <ModerationActions submissionId={submission.id} />
            </Card>
          )
        })}

        {(!submissions || submissions.length === 0) && (
          <div style={{ textAlign: 'center', padding: '64px 0', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
            <div style={{ width: '64px', height: '64px', margin: '0 auto', background: 'var(--bg-elevated)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '24px' }}>
              🎉
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)' }}>Queue is Empty</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '14px' }}>
              All submitted portfolios have been reviewed.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
