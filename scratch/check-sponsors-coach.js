const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Note: Use Anon Key with the user's JWT
async function run() {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Create user client
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  await supabase.auth.signInWithPassword({
    email: 'coach@test.local',
    password: 'SponsorPass123!'
  });

  const { data } = await supabase.from('sponsors').select('*');
  console.log("Coach can see sponsors:", data);
}
run();
