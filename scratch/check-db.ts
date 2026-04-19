import { createAdminClient } from '../lib/supabase/admin'

async function checkSponsor() {
  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from('profiles')
    .select('*')
    .eq('email', 'noreply+sponsor@exodiusftc.com')
    .maybeSingle()
  
  if (error) {
    console.error('Error fetching profile:', error)
  } else {
    console.log('Sponsor Profile:', profile)
  }

  const { data: sponsors } = await admin.from('sponsors').select('company_name')
  console.log('All Sponsors:', sponsors)
}

checkSponsor()
