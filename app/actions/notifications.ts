'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/actions-utils'

export async function markNotificationRead(id: string) {
  let user, supabase
  try {
    const auth = await requireAuth()
    user = auth.user
    supabase = auth.supabase
  } catch {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase.from('notifications')
    .update({ read_at: new Date().toISOString() } as never)
    .eq('id', id).eq('recipient_id', user.id) // RLS-safe

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/sponsor/inbox')
  return { success: true }
}

