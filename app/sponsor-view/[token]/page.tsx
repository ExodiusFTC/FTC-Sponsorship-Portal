import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { createHash } from 'crypto'
import { SponsorDecisionPanel } from '@/components/sponsor/sponsor-decision-panel'
import { Badge } from '@/components/ui/badge'

interface Props {
  params: Promise<{ token: string }>
}

function taxBadge(status: string): { label: string; className: string } | null {
  if (status === '501c3') return { label: '✓ IRS 501(c)(3) Tax-Exempt', className: 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] border-[var(--badge-success-text)]/20' }
  if (status === 'School') return { label: '✓ Public School Program', className: 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)]' }
  return null
}

export default async function SponsorViewPage({ params }: Props) {
  const { token } = await params
  const supabase = createAdminClient()

  const tokenHash = createHash('sha256').update(token).digest('hex')

  const { data: accessToken } = await supabase
    .from('submission_access_tokens')
    .select('*, submissions:submission_id(*, teams:team_id(*, profiles:owner_id(full_name, email)), sponsors:sponsor_id(*))')
    .eq('token_hash', tokenHash)
    .single()

  if (!accessToken) return notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = accessToken as any
  if (row.revoked_at) return notFound()

  const expired = new Date(row.expires_at) < new Date()
  const decided = !!row.used_at

  const submission = row.submissions
  type TeamData = Record<string, string | number | null | string[] | unknown[]>
  const team = submission.teams as TeamData
  const budgetItems = (team.budget_items as { label: string; qty: number; unit_cost_cents: number; total_cents: number }[]) ?? []
  const totalAsk = (team.financial_ask_cents as number) ?? 0
  const mediaUrls = (team.media_urls as string[]) ?? []

  const tax = taxBadge(team.tax_status as string)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">

        {/* Header */}
        <div className="bg-card rounded-xl border p-8 shadow-sm space-y-3">
          {mediaUrls.length > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrls[0]}
              alt="Team photo"
              className="w-full h-56 object-cover rounded-lg mb-4"
            />
          )}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{String(team.team_name ?? '')}</h1>
              <p className="text-muted-foreground mt-1">
                {team.ftc_team_number ? `FTC Team #${team.ftc_team_number}` : 'Incubator Team'} · {String(team.state ?? '')}
              </p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              {tax && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${tax.className}`}>
                  {tax.label}
                </span>
              )}
              <span className="text-2xl font-bold text-foreground">
                ${(totalAsk / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-muted-foreground">Total Request</span>
            </div>
          </div>

          {(expired || decided) && (
            <div className="mt-4 p-3 rounded-lg bg-[var(--badge-warning-bg)] border border-[var(--badge-warning-text)]/20 text-[var(--badge-warning-text)] text-sm font-medium">
              {decided ? 'A decision has already been recorded for this proposal.' : 'This proposal link has expired.'}
            </div>
          )}
        </div>

        {/* Custom Pitch */}
        <div className="bg-card rounded-xl border p-8 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Why We Align With You</h2>
          <p className="text-muted-foreground leading-relaxed">{String(submission.custom_pitch_alignment ?? '')}</p>
          <h2 className="text-lg font-semibold text-foreground pt-2">Our Specific Needs</h2>
          <p className="text-muted-foreground leading-relaxed">{String(submission.specific_needs_statement ?? '')}</p>
        </div>

        {/* Portfolio */}
        <div className="bg-card rounded-xl border p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-bold text-foreground">Team Portfolio</h2>
          {team.tagline && (
            <p className="text-muted-foreground italic">&ldquo;{String(team.tagline)}&rdquo;</p>
          )}
          {team.mission_statement && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Mission</p>
              <p className="text-foreground leading-relaxed">{String(team.mission_statement)}</p>
            </div>
          )}
          {team.technical_summary && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Technical</p>
              <p className="text-foreground leading-relaxed">{String(team.technical_summary)}</p>
            </div>
          )}
          {team.outreach_summary && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Outreach</p>
              <p className="text-foreground leading-relaxed">{String(team.outreach_summary)}</p>
            </div>
          )}
          {team.youtube_url && (() => { try { const h = new URL(String(team.youtube_url)).hostname.toLowerCase(); return h === 'youtu.be' || h.endsWith('youtube.com') } catch { return false } })() && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Video</p>
              <a href={String(team.youtube_url)} target="_blank" rel="noreferrer" className="text-primary underline text-sm">
                Watch on YouTube →
              </a>
            </div>
          )}
          {(team.drivetrain || team.build_system || team.programming) && (
            <div className="flex gap-2 flex-wrap">
              {team.drivetrain && <Badge variant="outline">Drive: {String(team.drivetrain)}</Badge>}
              {team.build_system && <Badge variant="outline">Build: {String(team.build_system)}</Badge>}
              {team.programming && <Badge variant="outline">Code: {String(team.programming)}</Badge>}
            </div>
          )}
        </div>

        {/* Budget */}
        <div className="bg-card rounded-xl border p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-foreground">Budget Breakdown</h2>
          <div className="divide-y divide-border">
            {budgetItems.map((item, i) => (
              <div key={i} className="flex justify-between py-2 text-sm">
                <span className="text-muted-foreground">{item.qty}× {item.label}</span>
                <span className="font-medium text-foreground">${(item.total_cents / 100).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between py-3 font-bold text-base text-foreground">
              <span>Total Request</span>
              <span>${(totalAsk / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Decision Panel */}
        {!expired && !decided && (
          <SponsorDecisionPanel
            token={token}
            totalAskCents={totalAsk}
            teamName={String(team.team_name ?? '')}
          />
        )}

        <p className="text-center text-xs text-muted-foreground pb-8">
          Verified by Matchmaker · FTC Sponsorship Portal
        </p>
      </div>
    </div>
  )
}
