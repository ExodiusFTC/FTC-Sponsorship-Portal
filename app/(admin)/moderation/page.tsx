import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import { ModerationActions } from '@/components/admin/moderation-actions'

export default async function ModerationPage() {
  const supabase = await createClient()

  // Fetch submissions that are pending review
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
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Moderation Queue</h1>
        <p className="text-muted-foreground">
          Review submitted portfolios and custom pitches. Approved submissions will be dispatched to sponsors.
        </p>
      </div>

      <div className="space-y-6">
        {submissions?.map((submission) => {
          const team = (submission.teams as any)
          const sponsor = (submission.sponsors as any)
          return (
            <Card key={submission.id}>
              <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">Submission to {sponsor?.company_name}</CardTitle>
                  <CardDescription className="text-base mt-1 text-foreground font-medium">
                    From: {team?.team_name} {team?.status === 'existing' && team?.ftc_team_number ? `(#${team.ftc_team_number})` : '(Incubator)'}
                  </CardDescription>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline">Financial Ask: ${((team?.financial_ask_cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Badge>
                    <span className="text-xs text-muted-foreground">Submitted: {new Date(submission.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6 border-b pb-6">
                  <div>
                    <h4 className="text-sm font-bold mb-2 uppercase tracking-tight text-muted-foreground">Custom Pitch Alignment</h4>
                    <p className="text-sm bg-muted/30 p-4 rounded-md border border-blue-100 whitespace-pre-wrap">{submission.custom_pitch_alignment}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold mb-2 uppercase tracking-tight text-muted-foreground">Specific Needs Statement</h4>
                    <p className="text-sm bg-muted/30 p-4 rounded-md border border-blue-100 whitespace-pre-wrap">{submission.specific_needs_statement}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Master Portfolio Data</h3>
                  <div>
                    <h4 className="text-xs font-bold mb-1 uppercase text-muted-foreground">Mission Statement</h4>
                    <p className="text-sm whitespace-pre-wrap">{team?.mission_statement}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold mb-1 uppercase text-muted-foreground">Technical Summary</h4>
                    <p className="text-sm whitespace-pre-wrap">{team?.technical_summary}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold mb-1 uppercase text-muted-foreground">Outreach Summary</h4>
                    <p className="text-sm whitespace-pre-wrap">{team?.outreach_summary}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-bold mb-2 uppercase text-muted-foreground">Budget Items</h4>
                    <ul className="text-sm space-y-1 bg-muted/20 p-3 rounded border">
                      {(team?.budget_items as any[])?.map((item, idx) => (
                        <li key={idx} className="flex justify-between border-b pb-1 last:border-0 last:pb-0">
                          <span>{item.qty}x {item.label}</span>
                          <span className="font-medium">${(item.total_cents / 100).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
              <ModerationActions submissionId={submission.id} />
            </Card>
          )
        })}

        {(!submissions || submissions.length === 0) && (
          <div className="text-center py-16 bg-muted/10 rounded-lg border border-dashed">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🎉</span>
            </div>
            <h3 className="text-xl font-medium">Queue is Empty</h3>
            <p className="text-muted-foreground mt-2">
              All submitted portfolios have been reviewed.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
