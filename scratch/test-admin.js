const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Get the pending pitch
  const { data: pitches, error } = await adminClient.from('submissions').select('*').eq('status', 'pending');
  console.log("Pending pitches in Admin Inbox:", pitches?.length, "Error:", error);
  
  if (pitches && pitches.length > 0) {
    const pitch = pitches[0];
    console.log("Approving Pitch:", pitch.id);
    const { error: updErr } = await adminClient.from('submissions').update({ status: 'dispatched' }).eq('id', pitch.id);
    if (updErr) console.error("Error approving:", updErr);
    else console.log("Pitch dispatched successfully!");
  }
}
run();
