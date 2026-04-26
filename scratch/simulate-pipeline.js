const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runPipeline() {
  console.log("Starting End-to-End Pipeline Simulation...");

  // 1. Setup Clients
  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const getCoachClient = async () => {
    const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    await c.auth.signInWithPassword({ email: 'coach@test.local', password: 'SponsorPass123!' });
    return c;
  };
  
  const getSponsorClient = async () => {
    const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    await c.auth.signInWithPassword({ email: 'sponsor@test.local', password: 'SponsorPass123!' });
    return c;
  };

  const coachClient = await getCoachClient();
  const { data: { user: coachUser } } = await coachClient.auth.getUser();

  // 2. Fetch Team and Sponsor
  const { data: team } = await coachClient.from('teams').select('*').eq('owner_id', coachUser.id).single();
  const { data: sponsor } = await coachClient.from('sponsors').select('*').eq('company_name', 'Test Sponsor Corp').single();

  if (!team || !sponsor) {
    console.error("Missing team or sponsor!");
    return;
  }

  console.log(`Team: ${team.team_name}, Sponsor: ${sponsor.company_name}`);

  // 3. Coach submits Pitch
  console.log("Coach creating pitch...");
  const { data: pitch, error: pitchErr } = await coachClient.from('submissions').insert({
    team_id: team.id,
    sponsor_id: sponsor.id,
    status: 'pending',
    custom_pitch_alignment: '<p>Our team aligns perfectly with your goals.</p>',
    specific_needs_statement: '<p>We need $500 for a new chassis.</p>',
    local_connection_notes: 'We are located right next door!',
    requested_amount_cents: 50000, // $500
    season: '2025-26'
  }).select('*').single();

  if (pitchErr) {
    console.error("Error creating pitch:", pitchErr);
    return;
  }
  console.log(`Pitch created! ID: ${pitch.id}`);

  // 4. Admin approves pitch
  console.log("Admin approving pitch...");
  const { error: adminErr } = await adminClient.from('submissions').update({
    status: 'dispatched'
  }).eq('id', pitch.id);

  if (adminErr) {
    console.error("Error approving pitch:", adminErr);
    return;
  }
  console.log("Admin approved pitch!");

  // 5. Sponsor accepts pitch
  console.log("Sponsor reviewing pitch...");
  const sponsorClient = await getSponsorClient();
  const { data: inbox } = await sponsorClient.from('submissions').select('*').eq('sponsor_id', sponsor.id).eq('status', 'dispatched');
  
  if (!inbox || inbox.length === 0) {
    console.error("Sponsor cannot see the dispatched pitch! RLS issue?");
    return;
  }

  console.log("Sponsor found the pitch! Funding it...");
  const { error: sponsorErr } = await sponsorClient.from('submissions').update({
    status: 'approved',
    sponsor_feedback: 'We love your team. Funding approved!'
  }).eq('id', pitch.id);

  if (sponsorErr) {
    console.error("Error funding pitch:", sponsorErr);
    return;
  }
  console.log("Sponsor funded the pitch successfully!");

  // 6. Verify coach sees it
  const { data: finalPitch } = await coachClient.from('submissions').select('*').eq('id', pitch.id).single();
  console.log(`Final pitch status: ${finalPitch.status}, Sponsor feedback: ${finalPitch.sponsor_feedback}`);
  
  console.log("Pipeline Simulation Complete: SUCCESS");
}

runPipeline().catch(console.error);
