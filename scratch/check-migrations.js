const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: migrations, error } = await supabase.from('supabase_migrations.schema_migrations').select('*');
  console.log("Applied Migrations:", migrations, "Error:", error);
}
run();
