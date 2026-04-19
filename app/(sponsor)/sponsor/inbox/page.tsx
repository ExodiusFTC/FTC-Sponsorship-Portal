import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SponsorInboxWrapper } from '@/components/sponsor/inbox-wrapper'

export default async function SponsorInboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
        <p className="text-muted-foreground mt-1">Notifications and communications from teams.</p>
      </div>

      <SponsorInboxWrapper notifications={(notifications as any) || []} />
    </div>
  )
}
