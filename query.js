const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'MISSING';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const u2 = await supabase.auth.admin.updateUserById('472ac6e1-eff6-4eee-9542-6c5500847c7c', { password: 'devpassword123!' });
  console.log("updateUser coach error:", u2.error);
  const { data, error } = await supabase.from('profiles').select('*');
  console.log("Profiles:", JSON.stringify(data, null, 2));
}
main();
