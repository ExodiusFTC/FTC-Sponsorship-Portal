import { getAuthedProfile } from '@/lib/actions-utils'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { CommandPaletteProvider } from '@/components/command-palette-provider'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await getAuthedProfile()
  if (!authed) redirect('/login')
  const { supabase, user } = authed

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const userName = user.full_name ?? user.email ?? 'Admin'
  const userEmail = user.email ?? ''

  return (
    <div className="flex h-screen overflow-hidden text-foreground">
      <AdminSidebar userName={userName} userEmail={userEmail} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1100px] px-6 py-8 sm:px-8 lg:px-12">
          {children}
        </div>
      </main>
      <CommandPaletteProvider />
    </div>
  )
}
