import { getAuthedProfile } from '@/lib/actions-utils'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'

export default async function SponsorLayout({ children }: { children: React.ReactNode }) {
  const authed = await getAuthedProfile()
  if (!authed) redirect('/login')
  const { supabase, user } = authed

  const { data: profile } = await supabase.from('profiles').select('role, sponsor_id').eq('id', user.id).single()
  if (profile?.role === 'admin') redirect('/admin')
  if (profile?.role === 'coach') redirect('/dashboard')
  if (profile?.role !== 'sponsor') redirect('/login')

  if (!profile.sponsor_id) {
    return (
      <AppLayout role="sponsor">
        <div className="mx-auto max-w-xl py-24">
          <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Awaiting verification</h1>
            <p className="text-sm text-muted-foreground">
              Thanks for applying. An administrator is reviewing your sponsor application — most are approved within 24 hours. You will receive an email when your account is activated.
            </p>
            <p className="text-xs text-muted-foreground">
              Need to update your application?{' '}
              <a className="underline" href="mailto:support@exodiusftc.com">Contact support</a>.
            </p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return <AppLayout>{children}</AppLayout>
}
