'use client'

import { useOptimistic, useTransition } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { markNotificationRead } from '@/app/actions/notifications'
import type { Notification } from '@/lib/supabase/types'

export function InboxTab({ notifications, switchTab }: { notifications: Notification[], switchTab: (t: string) => void }) {
  const [, startTransition] = useTransition()

  const [optimisticNotifications, markRead] = useOptimistic(
    notifications,
    (state, id: string) =>
      state.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
  )

  const handleRead = (id: string) => {
    startTransition(async () => {
      markRead(id)
      const result = await markNotificationRead(id)
      if (result?.error) {
        toast.error('Could not mark notification as read. Please try again.')
      }
    })
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'submission_declined': return <XCircle className="text-rose-500 h-5 w-5" />
      case 'submission_approved': return <CheckCircle2 className="text-emerald-600 h-5 w-5" />
      case 'submission_changes_requested': return <AlertCircle className="text-amber-500 h-5 w-5" />
      default: return <AlertCircle className="text-muted-foreground h-5 w-5" />
    }
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-20">
      {optimisticNotifications.length === 0 ? (
        <div className="text-center text-[13px] text-muted-foreground p-12 border border-dashed border-border rounded-xl bg-card shadow-sm">
          No notifications yet.
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {optimisticNotifications.map((n) => (
            <motion.div
              key={n.id}
              layout
              animate={{ opacity: n.read_at ? 0.6 : 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`p-5 rounded-xl border flex items-start gap-4 cursor-pointer transition-all shadow-sm ${
                n.read_at
                  ? 'bg-card border-border border-dashed hover:border-border/80'
                  : 'bg-card border-border hover:border-border/80 hover:shadow-md'
              }`}
              onClick={() => n.submission_id && switchTab('submissions')}
            >
              <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground text-[14px] truncate">{n.title}</h3>
                <div className="text-[13px] text-muted-foreground mt-1.5 whitespace-pre-wrap leading-relaxed">{n.body}</div>
                <div className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5 font-mono">
                  <Calendar className="h-3 w-3" />
                  {new Date(n.created_at).toLocaleDateString()}
                </div>
              </div>
              {!n.read_at && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRead(n.id) }}
                  className="text-[11px] font-medium text-primary hover:text-primary/90 bg-primary/5 hover:bg-primary/10 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 border border-primary/10"
                >
                  Mark as read
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}
