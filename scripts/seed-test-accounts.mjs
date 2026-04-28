/**
 * Seed test accounts for manual QA.
 * Run from project root: node scripts/seed-test-accounts.mjs
 *
 * What it does:
 *   1. Deletes ALL existing auth users (clean slate)
 *   2. Creates coach / admin / sponsor accounts (email pre-confirmed)
 *   3. Creates "dev testing" sponsor company and links it to the sponsor user
 *   4. Marks coach as verified and creates a starter team so they can build a portfolio right away
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cvvmtklqsihxjfnenczi.supabase.co'
const SERVICE_ROLE_KEY = '***SERVICE_ROLE_KEY_REDACTED***'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ─── Credentials ─────────────────────────────────────────────────────────────
const ACCOUNTS = {
  coach: {
    email: 'coach@devtest.local',
    password: 'CoachTest123!',
    fullName: 'Dev Coach',
    role: 'coach',
  },
  admin: {
    email: 'admin@devtest.local',
    password: 'AdminTest123!',
    fullName: 'Dev Admin',
    role: 'admin',
  },
  sponsor: {
    email: 'sponsor@devtest.local',
    password: 'SponsorTest123!',
    fullName: 'Dev Sponsor',
    role: 'sponsor',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function log(msg) { console.log(`  ✓ ${msg}`) }
function warn(msg) { console.warn(`  ⚠ ${msg}`) }
function section(title) { console.log(`\n── ${title} ──`) }

// ─── Step 1: Wipe all users ───────────────────────────────────────────────────
async function wipeUsers() {
  section('Wiping existing users')
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw new Error(`listUsers failed: ${error.message}`)

  if (data.users.length === 0) {
    log('No existing users found')
    return
  }

  for (const user of data.users) {
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
    if (delErr) warn(`Could not delete ${user.email}: ${delErr.message}`)
    else log(`Deleted ${user.email}`)
  }
}

// ─── Step 2: Create an auth user (email pre-confirmed) ───────────────────────
async function createUser(email, password, fullName, role) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  })
  if (error) throw new Error(`createUser(${email}) failed: ${error.message}`)
  log(`Created auth user ${email}  [id: ${data.user.id}]`)
  return data.user.id
}

// ─── Step 3: Upsert profile fields the trigger doesn't set ───────────────────
async function patchProfile(id, patch) {
  // Retry up to 5× to handle trigger propagation lag
  for (let i = 0; i < 5; i++) {
    const { error } = await admin.from('profiles').update(patch).eq('id', id)
    if (!error) { log(`Patched profile ${id}`); return }
    await new Promise(r => setTimeout(r, 400))
  }
  throw new Error(`patchProfile(${id}) failed after retries`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  FTC Portal — test account seeder\n')

  // 1. Wipe
  await wipeUsers()

  // 2. Create auth users
  section('Creating auth users')
  const coachId   = await createUser(ACCOUNTS.coach.email,   ACCOUNTS.coach.password,   ACCOUNTS.coach.fullName,   ACCOUNTS.coach.role)
  const adminId   = await createUser(ACCOUNTS.admin.email,   ACCOUNTS.admin.password,   ACCOUNTS.admin.fullName,   ACCOUNTS.admin.role)
  const sponsorId = await createUser(ACCOUNTS.sponsor.email, ACCOUNTS.sponsor.password, ACCOUNTS.sponsor.fullName, ACCOUNTS.sponsor.role)

  // Give the DB trigger a moment to insert profiles
  await new Promise(r => setTimeout(r, 1200))

  // 3. Patch admin role (trigger defaults to 'coach' if metadata isn't read)
  section('Configuring roles')
  await patchProfile(adminId, { role: 'admin' })
  await patchProfile(coachId, {
    role: 'coach',
    coach_verified: true,
    coppa_acknowledged: true,
    tos_accepted: true,
  })

  // 4. Create "dev testing" sponsor company
  section('Creating sponsor company')
  const { data: sponsorRow, error: sponsorErr } = await admin
    .from('sponsors')
    .upsert(
      {
        company_name: 'dev testing',
        contact_name: ACCOUNTS.sponsor.fullName,
        contact_email: ACCOUNTS.sponsor.email,
        funding_cap_cents: 500000,   // $5,000
        status: 'active',
        source: 'admin_added',
      },
      { onConflict: 'company_name' }
    )
    .select('id')
    .single()

  if (sponsorErr) throw new Error(`sponsors insert failed: ${sponsorErr.message}`)
  log(`Created sponsor company "dev testing"  [id: ${sponsorRow.id}]`)

  // 5. Link sponsor profile → company
  section('Linking sponsor account to company')
  await patchProfile(sponsorId, {
    role: 'sponsor',
    sponsor_id: sponsorRow.id,
    coppa_acknowledged: true,
    tos_accepted: true,
  })

  // 6. Create also a sponsor_application entry so admin queue shows it
  await admin.from('sponsor_applications').insert({
    company_name: 'dev testing',
    contact_name: ACCOUNTS.sponsor.fullName,
    contact_email: ACCOUNTS.sponsor.email,
    proposed_cap_cents: 500000,
    message: 'Dev testing account — pre-approved',
    status: 'approved',
  }).then(({ error }) => {
    if (error && !error.message.includes('unique')) warn(`sponsor_applications insert: ${error.message}`)
    else log('Created sponsor_applications record (approved)')
  })

  // 7. Create a starter team for the coach so they can immediately build a portfolio
  section('Creating starter team for coach')
  const { data: team, error: teamErr } = await admin
    .from('teams')
    .insert({
      owner_id: coachId,
      status: 'existing',
      ftc_team_number: 99999,
      team_name: 'Dev Test Team',
      organization: 'Dev School',
      city: 'Austin',
      state: 'TX',
      mission_statement: 'A test team for development and QA purposes.',
      tax_status: 'None',
    })
    .select('id')
    .single()

  if (teamErr) throw new Error(`teams insert failed: ${teamErr.message}`)
  log(`Created team "Dev Test Team"  [id: ${team.id}]`)

  // 8. Print credentials summary
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║               TEST ACCOUNT CREDENTIALS                       ║
╠══════════════════════════════════════════════════════════════╣
║  COACH                                                        ║
║    Email:    coach@devtest.local                              ║
║    Password: CoachTest123!                                    ║
║    Status:   verified ✓  |  Team: Dev Test Team (#99999)     ║
╠══════════════════════════════════════════════════════════════╣
║  ADMIN                                                        ║
║    Email:    admin@devtest.local                              ║
║    Password: AdminTest123!                                    ║
╠══════════════════════════════════════════════════════════════╣
║  SPONSOR                                                      ║
║    Email:    sponsor@devtest.local                            ║
║    Password: SponsorTest123!                                  ║
║    Company:  dev testing  ($5,000 cap, active)               ║
╚══════════════════════════════════════════════════════════════╝

Next steps:
  1. Log in as coach → create a submission/portfolio targeting "dev testing"
  2. Log in as admin → approve the submission
  3. Check sponsor inbox / email to confirm delivery
`)
}

main().catch(err => { console.error('\n❌ ', err.message); process.exit(1) })
