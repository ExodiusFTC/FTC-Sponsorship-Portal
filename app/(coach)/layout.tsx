import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, coach_credentials_url, coach_verified')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') redirect('/admin')

  if (!profile?.coach_credentials_url) redirect('/upload-credentials')

  if (!profile?.coach_verified) redirect('/awaiting-verification')

  return <AppLayout>{children}</AppLayout>
}
