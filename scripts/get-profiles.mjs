import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cvvmtklqsihxjfnenczi.supabase.co'
const SERVICE_ROLE_KEY = '***SERVICE_ROLE_KEY_REDACTED***'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function main() {
  const { data: profiles, error } = await admin.from('profiles').select('*')
  if (error) {
    console.error(error)
    return
  }
  console.log(JSON.stringify(profiles, null, 2))
}

main()
