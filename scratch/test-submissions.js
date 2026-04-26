const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const sponsorClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  await sponsorClient.auth.signInWithPassword({ email: 'sponsor@test.local', password: 'SponsorPass123!' });
  const { data: { user } } = await sponsorClient.auth.getUser();
  
  const { data: profile } = await sponsorClient.from('profiles').select('*').eq('id', user.id).single();
  
  // Find a team
  const { data: team } = await adminClient.from('teams').select('id').limit(1).single();
  
  // Insert submission via Admin
  const { data: newSub, error: insErr } = await adminClient.from('submissions').insert({
    team_id: team.id,
    sponsor_id: profile.sponsor_id,
    status: 'dispatched',
    custom_pitch_alignment: 'test',
    specific_needs_statement: 'test',
    requested_amount_cents: 100,
    season: '2025-26'
  }).select('*').single();
  
  console.log("Inserted Sub:", newSub ? newSub.id : insErr);
  
  // Query via Sponsor
  const { data: pitches, error: selErr } = await sponsorClient.from('submissions').select('*');
  console.log("Pitches visible to Sponsor:", pitches, selErr);
}
run();
