const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const sponsorClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  await sponsorClient.auth.signInWithPassword({ email: 'sponsor@test.local', password: 'SponsorPass123!' });
  const { data: { user } } = await sponsorClient.auth.getUser();
  console.log("Logged in Sponsor User ID:", user.id);
  
  const { data: profile } = await sponsorClient.from('profiles').select('*').eq('id', user.id).single();
  console.log("Profile seen by Sponsor Client:", profile);
  
  const { data: pitches, error } = await sponsorClient.from('submissions').select('*');
  console.log("Pitches seen by Sponsor Client:", pitches, "Error:", error);
}
run();
