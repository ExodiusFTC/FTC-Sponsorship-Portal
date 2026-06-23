import { getAuthedProfile } from '@/lib/actions-utils'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const authed = await getAuthedProfile()
  if (!authed) redirect('/login')
  return <AppLayout>{children}</AppLayout>
}
