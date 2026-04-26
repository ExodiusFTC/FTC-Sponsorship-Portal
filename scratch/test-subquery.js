const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const sponsorClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  await sponsorClient.auth.signInWithPassword({ email: 'sponsor@test.local', password: 'SponsorPass123!' });
  const { data: { user } } = await sponsorClient.auth.getUser();
  
  const { data: profile } = await sponsorClient.from('profiles').select('*').eq('id', user.id).single();
  console.log("Profile Sponsor ID:", profile.sponsor_id);
  
  const { data: test, error: testErr } = await sponsorClient.from('profiles')
    .select('id')
    .eq('id', user.id)
    .eq('role', 'sponsor')
    .eq('sponsor_id', profile.sponsor_id);
    
  console.log("Subquery test:", test, "Error:", testErr);
}
run();
