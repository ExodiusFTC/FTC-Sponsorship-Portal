import { getAuthedProfile } from '@/lib/actions-utils'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const authed = await getAuthedProfile()
  if (!authed) redirect('/login')
  const { supabase, user } = authed

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile?.role as 'coach' | 'admin' | 'sponsor' | undefined) ?? undefined

  return <AppLayout role={role}>{children}</AppLayout>
}
