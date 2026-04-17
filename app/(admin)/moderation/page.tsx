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
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard') // Or an access denied page
  }

  // Fetch pitches that are submitted (waiting for moderation)
  const { data: pitches } = await supabase
    .from('pitches')
    .select(`
      *,
      teams ( team_name, ftc_team_number, status )
    `)
    .eq('status', 'submitted')
    .order('created_at', { ascending: true })

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Moderation Queue</h1>
        <p className="text-muted-foreground">
          Review submitted pitches. Approved pitches will be queued for dispatch.
        </p>
      </div>

      <div className="space-y-6">
        {pitches?.map((pitch) => (
          <Card key={pitch.id}>
            <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{pitch.title}</CardTitle>
                <CardDescription className="text-base mt-1 text-foreground font-medium">
                  {/* @ts-ignore */}
                  {pitch.teams?.team_name} {pitch.teams?.status === 'existing' && pitch.teams?.ftc_team_number ? `(#${pitch.teams.ftc_team_number})` : '(Incubator)'}
                </CardDescription>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline">Financial Ask: ${(pitch.financial_ask_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Badge>
                  <span className="text-xs text-muted-foreground">Submitted: {new Date(pitch.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-1">Executive Summary</h4>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">{pitch.summary}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-1">Cost Explanation</h4>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">{pitch.cost_explanation}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Line Items</h4>
                <ul className="text-sm space-y-1 bg-muted/30 p-3 rounded border">
                  {(pitch.line_items as any[])?.map((item, idx) => (
                    <li key={idx} className="flex justify-between border-b pb-1 last:border-0 last:pb-0">
                      <span>{item.qty}x {item.label}</span>
                      <span className="font-medium">${(item.totalCents / 100).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <ModerationActions pitchId={pitch.id} />
          </Card>
        ))}

        {(!pitches || pitches.length === 0) && (
          <div className="text-center py-16 bg-muted/10 rounded-lg border border-dashed">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🎉</span>
            </div>
            <h3 className="text-xl font-medium">Queue is Empty</h3>
            <p className="text-muted-foreground mt-2">
              All submitted pitches have been reviewed.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
