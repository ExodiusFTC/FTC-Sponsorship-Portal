'use client'

import { useRouter } from 'next/navigation'
import { InboxTab } from '@/components/coach/inbox-tab'
import type { Notification } from '@/lib/supabase/types'

export function SponsorInboxWrapper({ notifications }: { notifications: Notification[] }) {
  const router = useRouter()
  return (
    <InboxTab 
      notifications={notifications} 
      switchTab={() => router.push('/sponsor/submissions')} 
    />
  )
}
