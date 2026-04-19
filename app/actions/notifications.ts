'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markNotificationRead(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

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
