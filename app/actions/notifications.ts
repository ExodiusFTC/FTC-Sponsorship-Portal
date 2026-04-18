'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markNotificationRead(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  await supabase.from('notifications')
    .update({ read_at: new Date().toISOString() } as never)
    .eq('id', id).eq('recipient_id', user.id) // RLS-safe
  revalidatePath('/dashboard')
}
