'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, AlertCircle, Calendar } from 'lucide-react'
import { markNotificationRead } from '@/app/actions/notifications'
import type { Notification } from '@/lib/supabase/types'

export function InboxTab({ notifications, switchTab }: { notifications: Notification[], switchTab: (t: string) => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const handleRead = (id: string) => {
    startTransition(async () => {
      await markNotificationRead(id)
    })
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'submission_declined': return <XCircle className="text-red-500 h-5 w-5" />
      case 'submission_approved': return <CheckCircle2 className="text-emerald-500 h-5 w-5" />
      case 'submission_changes_requested': return <AlertCircle className="text-yellow-500 h-5 w-5" />
      default: return <AlertCircle className="text-zinc-500 h-5 w-5" />
    }
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {notifications.length === 0 ? (
        <div className="text-center text-zinc-500 p-8 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/60">No notifications yet.</div>
      ) : (
        notifications.map((n) => (
          <div key={n.id} className={`p-4 rounded-lg border flex items-start gap-4 cursor-pointer transition-colors ${n.read_at ? 'bg-zinc-950/50 border-zinc-900 border-dashed hover:border-zinc-700' : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500'}`} onClick={() => n.submission_id && switchTab('submissions')}>
            <div className="mt-1">{getIcon(n.type)}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-zinc-100 text-sm truncate">{n.title}</h3>
              <div className="text-sm text-zinc-400 mt-1 whitespace-pre-wrap">{n.body}</div>
              <div className="text-xs text-zinc-500 mt-3 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {new Date(n.created_at).toLocaleDateString()}
              </div>
            </div>
            {!n.read_at && (
              <button
                onClick={(e) => { e.stopPropagation(); handleRead(n.id) }}
                disabled={isPending}
                 className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded transition-colors whitespace-nowrap disabled:opacity-50"
              >
                Mark as read
              </button>
            )}
          </div>
        ))
      )}
    </div>
  )
}
