
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function checkUserNotifications(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: notifications, count: exactCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('recipient_id', userId)

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null)

  console.log(`User: ${userId}`)
  console.log(`Total Notifications (Exact): ${exactCount}`)
  console.log(`Unread Notifications (Exact): ${unreadCount}`)
  console.log(`Notifications Data:`, notifications)
}

// I'll try to find a user ID from the profiles table first
async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, email')
  console.log('Profiles:', profiles)
  
  if (profiles && profiles.length > 0) {
    for (const p of profiles) {
      await checkUserNotifications(p.id)
    }
  }
}

run()
