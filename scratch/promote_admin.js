const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function promoteToAdmin(email) {
  console.log(`Promoting ${email} to admin...`)
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      role: 'admin',
      coach_verified: true 
    })
    .eq('email', email)
    .select()

  if (error) {
    console.error('Error updating profile:', error)
  } else if (data.length === 0) {
    console.error('No profile found for that email.')
  } else {
    console.log('Success! Profile updated:', data[0])
  }
}

const email = 'number1noob1234@gmail.com'
promoteToAdmin(email)
