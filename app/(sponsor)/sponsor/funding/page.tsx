import { getAuthedProfile } from '@/lib/actions-utils'
import { redirect } from 'next/navigation'
import { Wallet, History, ArrowUpRight, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export default async function SponsorFundingPage() {
  const authed = await getAuthedProfile()
  if (!authed) redirect('/login')
  const { supabase, user } = authed

  const { data: profile } = await supabase
    .from('profiles')
    .select('sponsor_id, sponsors(*)')
    .eq('id', user.id)
    .single()

  if (!profile?.sponsor_id) redirect('/dashboard')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sponsor = (profile as any)?.sponsors ?? null
  
  if (!sponsor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl bg-card/30">
        <h2 className="text-xl font-semibold">No Funding Account</h2>
        <p className="text-muted-foreground mt-2">Could not find a linked sponsor record for your account.</p>
      </div>
    )
  }

  const { data: transactions } = await supabase
    .from('transactions_ledger')
    .select('*, teams(team_name)')
    .eq('sponsor_id', profile.sponsor_id)
    .order('created_at', { ascending: false })

  const used = sponsor.funding_used_cents
  const total = sponsor.funding_cap_cents
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Funding & Budget</h1>
        <p className="text-muted-foreground mt-1">Track your seasonal budget and active disbursements.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Available Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${((total - used) / 100).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Out of ${ (total / 100).toLocaleString() } total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Utilized</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">{percentage}%</div>
            <Progress value={percentage} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{transactions?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Confirmed disbursements</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent funding disbursements to teams.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions?.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{(t.teams as any).team_name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-500">+${(t.amount_cents / 100).toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Confirmed</div>
                </div>
              </div>
            ))}
            {(!transactions || transactions.length === 0) && (
              <div className="text-center py-10 text-muted-foreground italic text-sm">
                No transactions recorded yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
