const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseKey === 'MISSING') {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetAccounts() {
  console.log('--- Clearing Database of All Accounts ---');

  // 1. List all users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError.message);
    return;
  }

  console.log(`Found ${users.length} users. Deleting...`);

  // 2. Delete all users
  for (const user of users) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error(`Error deleting user ${user.email}:`, deleteError.message);
    } else {
      console.log(`Deleted user: ${user.email}`);
    }
  }

  // 3. Clear existing sponsors and submissions to avoid conflicts
  console.log('Clearing sponsors and submissions tables...');
  await supabase.from('submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('sponsors').delete().neq('company_name', '');

  console.log('\n--- Seeding Dev Testing Accounts ---');

  // Create a default sponsor company for the sponsor account
  const { data: sponsorCorp, error: corpError } = await supabase.from('sponsors').insert({
    company_name: 'Test Sponsor Corp',
    industry: 'Technology',
    contact_name: 'Jane Sponsor',
    contact_email: 'sponsor@test.local',
    funding_cap_cents: 1000000,
    status: 'active'
  }).select().single();

  if (corpError) {
    console.error('Error creating test sponsor corp:', corpError.message);
    return;
  }

  const accounts = [
    {
      email: 'admin@test.local',
      password: 'SponsorPass123!',
      fullName: 'Dev Admin',
      role: 'admin',
      verified: true,
    },
    {
      email: 'coach@test.local',
      password: 'SponsorPass123!',
      fullName: 'Dev Coach',
      role: 'coach',
      verified: true,
    },
    {
      email: 'unverified@test.local',
      password: 'SponsorPass123!',
      fullName: 'New Coach',
      role: 'coach',
      verified: false,
    },
    {
      email: 'sponsor@test.local',
      password: 'SponsorPass123!',
      fullName: 'Test Sponsor',
      role: 'sponsor',
      verified: true,
      sponsor_id: sponsorCorp.id
    },
  ];

  for (const acc of accounts) {
    console.log(`Creating ${acc.role} account: ${acc.email}...`);
    
    // Create auth user
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true,
      user_metadata: { full_name: acc.fullName },
    });

    if (createError) {
      console.error(`Error creating ${acc.email}:`, createError.message);
      continue;
    }

    // Update profile
    const updatePayload = {
      role: acc.role,
      coach_verified: acc.verified,
      full_name: acc.fullName,
    };
    if (acc.sponsor_id) {
      updatePayload.sponsor_id = acc.sponsor_id;
    }

    const { error: profileError } = await supabase.from('profiles').update(updatePayload).eq('id', user.id);

    if (profileError) {
      console.error(`Error updating profile for ${acc.email}:`, profileError.message);
    } else {
      console.log(`Successfully created and configured ${acc.email}`);
      
      // If it's the verified coach, create a team portfolio immediately
      if (acc.email === 'coach@test.local') {
        console.log('Creating team portfolio for verified coach...');
        const { error: teamError } = await supabase.from('teams').insert({
          owner_id: user.id,
          team_name: 'Dev Testing Team',
          status: 'existing',
          ftc_team_number: 99999,
          organization: 'Test Org',
          city: 'Test City',
          state: 'TS',
          tax_status: '501c3',
          financial_ask_cents: 500000,
          mission_statement: 'To test the platform thoroughly.',
        });
        if (teamError) console.error('Error creating team:', teamError.message);
        else console.log('Team created successfully.');
      }
    }
  }

  console.log('\n--- Reset and Seed Complete ---');
}

resetAccounts();
