
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function checkNotifications() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase.from('notifications').select('*')
  if (error) {
    console.error('Error fetching notifications:', error)
  } else {
    console.log('All Notifications:', data)
  }
}

checkNotifications()
