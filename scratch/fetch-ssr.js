const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: { session } } = await supabase.auth.signInWithPassword({ email: 'coach@test.local', password: 'SponsorPass123!' });
  
  const res = await fetch('http://localhost:3000/dashboard?tab=find-sponsors', {
    headers: {
      cookie: `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token=${encodeURIComponent(JSON.stringify([session.access_token, session.refresh_token, null, null, null]))}`
    }
  });
  
  const text = await res.text();
  require('fs').writeFileSync('scratch/fetch-ssr.html', text);
  console.log("Saved SSR HTML to scratch/fetch-ssr.html");
}
run();
