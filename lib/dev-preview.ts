/**
 * DEV-ONLY sponsor portal preview.
 *
 * Lets you browse the entire sponsor portal on localhost with no Clerk sign-in
 * and no live Supabase — every read resolves to the static fixtures below.
 * Purely for UI/UX editing.
 *
 * Activated ONLY when running `next dev` (NODE_ENV !== 'production') AND
 * `NEXT_PUBLIC_SPONSOR_PREVIEW=1`. It can never switch on in a production build,
 * so it is safe to leave the wiring in place.
 *
 * Launch with:  npm run dev:sponsor-preview
 */

export const SPONSOR_PREVIEW =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_SPONSOR_PREVIEW === '1'

const PROFILE_ID = 'preview-profile'
const SPONSOR_ID = 'preview-sponsor'
const TEAM_ID_A = 'preview-team-a'
const TEAM_ID_B = 'preview-team-b'

// ---- static fixtures -------------------------------------------------------

const sponsor = {
  id: SPONSOR_ID,
  company_name: 'Helix Robotics Foundation',
  contact_email: 'partnerships@helix.example',
  contact_name: 'Jordan Avery',
  contact_title: 'Director of Community Impact',
  created_at: '2026-01-12T15:00:00.000Z',
  updated_at: '2026-06-01T15:00:00.000Z',
  funding_cap_cents: 5_000_000, // $50,000 seasonal cap
  funding_used_cents: 1_850_000, // $18,500 committed
  geo_states: ['CA', 'TX', 'NY'],
  industry: 'Industrial Automation',
  logo_url: null,
  notes: null,
  search_vector: null,
  source: 'admin_added',
  status: 'active',
  website: 'https://helix.example',
}

const profile = {
  id: PROFILE_ID,
  clerk_user_id: 'preview-clerk-user',
  email: 'sponsor@preview.local',
  full_name: 'Jordan Avery',
  role: 'sponsor',
  sponsor_id: SPONSOR_ID,
  coach_verified: false,
  coppa_acknowledged: false,
  tos_accepted: true,
  age_confirmed_at: null,
  date_of_birth: null,
  city: 'San Jose',
  state: 'CA',
  zip_code: '95113',
  phone_number: null,
  coach_credentials_url: null,
  pending_team_data: null,
  referral_source: null,
  created_at: '2026-01-12T15:00:00.000Z',
  updated_at: '2026-06-01T15:00:00.000Z',
  // nested join used by `.select('*, sponsors(*)')`
  sponsors: sponsor,
}

function makeTeam(id: string, over: Record<string, unknown>) {
  return {
    id,
    owner_id: 'preview-coach',
    team_name: 'Team',
    ftc_team_number: 11111,
    slug: 'team',
    organization: 'Lincoln High School',
    city: 'San Jose',
    state: 'CA',
    tagline: 'Engineering the future, one match at a time.',
    mission_statement:
      'We are a student-led FTC team building competitive robots while running STEM outreach for our community.',
    technical_summary:
      'Custom swerve drivetrain, dual-motor linear lift, and a vision-assisted autonomous routine.',
    autonomous_description: 'AprilTag-localized auto scoring 3 specimens in 30s.',
    drivetrain: 'Custom swerve',
    control_system: 'REV Control Hub',
    build_system: 'goBILDA + custom CNC',
    cad_software: 'Onshape',
    programming: 'Java / FTC SDK',
    manufacturing_capabilities: ['3D printing', 'CNC routing', 'Laser cutting'],
    sensors: ['IMU', 'Color sensor', 'Distance sensor'],
    proudest_mechanism_name: 'Compliant intake',
    proudest_mechanism_problem: 'Reliably grabbing game pieces at speed.',
    proudest_mechanism_solution: 'A flexible silicone roller intake tuned over 4 iterations.',
    outreach_summary: 'Ran 6 community workshops reaching 200+ students this season.',
    community_interest_text: 'Mentoring two new rookie teams in our district.',
    subteam_breakdown: 'Build, Programming, Outreach, Business.',
    financial_ask_cents: 750_000,
    seed_funding_goals_cents: 500_000,
    tax_status: '501c3',
    status: 'existing',
    public: true,
    github_link: 'https://github.com/example/team',
    youtube_url: null,
    logo_url: null,
    coach_photo_url: null,
    budget_items: [],
    media_urls: [],
    visual_pitch_items: [],
    team_members: [],
    deleted_at: null,
    created_at: '2026-02-01T15:00:00.000Z',
    updated_at: '2026-06-01T15:00:00.000Z',
    team_achievements: [],
    ...over,
  }
}

const teamA = makeTeam(TEAM_ID_A, {
  team_name: 'Quantum Foxes',
  ftc_team_number: 31579,
  slug: 'quantum-foxes',
  team_achievements: [
    { id: 'ach-1', team_id: TEAM_ID_A, event_name: 'NorCal Regional', award: 'Inspire Award – 2nd', season: '2025-2026', description: 'Top-tier judged award for overall excellence.', created_at: '2026-03-01T15:00:00.000Z' },
    { id: 'ach-2', team_id: TEAM_ID_A, event_name: 'Silicon Valley Qualifier', award: 'Winning Alliance Captain', season: '2025-2026', description: null, created_at: '2026-02-15T15:00:00.000Z' },
  ],
})

const teamB = makeTeam(TEAM_ID_B, {
  team_name: 'Iron Aviators',
  ftc_team_number: 18420,
  slug: 'iron-aviators',
  organization: 'Roosevelt STEM Academy',
  city: 'Austin',
  state: 'TX',
})

function makeSubmission(id: string, team: typeof teamA, over: Record<string, unknown>) {
  return {
    id,
    sponsor_id: SPONSOR_ID,
    team_id: team.id,
    status: 'pending',
    requested_amount_cents: 750_000,
    custom_pitch_alignment:
      'Your foundation funds underrepresented STEM programs — half our roster is first-generation college-bound.',
    specific_needs_statement:
      'Funding covers a second Control Hub, competition registration, and travel to the regional championship.',
    local_connection_notes: 'Two of our mentors are Helix Robotics alumni.',
    admin_feedback: null,
    season: '2025-2026',
    variant_label: null,
    is_locked: false,
    requested_amount: 7500,
    reviewed_at: null,
    reviewed_by: null,
    submitted_at: '2026-05-20T15:00:00.000Z',
    sent_at: '2026-05-21T15:00:00.000Z',
    delivered_at: null,
    expires_at: null,
    deleted_at: null,
    resend_message_id: null,
    created_at: '2026-05-20T15:00:00.000Z',
    updated_at: '2026-05-21T15:00:00.000Z',
    // nested joins
    teams: team,
    sponsors: { company_name: sponsor.company_name },
    ...over,
  }
}

const submissions = [
  makeSubmission('preview-sub-1', teamA, { status: 'pending' }),
  makeSubmission('preview-sub-2', teamB, {
    status: 'approved',
    requested_amount_cents: 500_000,
    requested_amount: 5000,
    reviewed_at: '2026-05-28T15:00:00.000Z',
  }),
  makeSubmission('preview-sub-3', teamA, {
    status: 'changes_requested',
    requested_amount_cents: 300_000,
    requested_amount: 3000,
    admin_feedback: 'Please clarify the travel budget line item before we proceed.',
  }),
]

const notifications = [
  { id: 'ntf-1', recipient_id: PROFILE_ID, type: 'general', title: 'New pitch from Quantum Foxes', body: 'A new sponsorship request is waiting for your review.', submission_id: 'preview-sub-1', read_at: null, created_at: '2026-05-21T16:00:00.000Z' },
  { id: 'ntf-2', recipient_id: PROFILE_ID, type: 'general', title: 'Pitch approved', body: 'You approved funding for Iron Aviators.', submission_id: 'preview-sub-2', read_at: '2026-05-28T16:00:00.000Z', created_at: '2026-05-28T15:05:00.000Z' },
]

const transactions = [
  { id: 'txn-1', sponsor_id: SPONSOR_ID, submission_id: 'preview-sub-2', team_id: TEAM_ID_B, amount_cents: 500_000, actor_type: 'sponsor', decision_type: 'approve', created_at: '2026-05-28T15:10:00.000Z', teams: { team_name: 'Iron Aviators' } },
  { id: 'txn-2', sponsor_id: SPONSOR_ID, submission_id: 'preview-sub-1', team_id: TEAM_ID_A, amount_cents: 1_350_000, actor_type: 'sponsor', decision_type: 'approve', created_at: '2026-04-10T15:10:00.000Z', teams: { team_name: 'Quantum Foxes' } },
]

const FIXTURES: Record<string, unknown[]> = {
  profiles: [profile],
  sponsors: [sponsor],
  teams: [teamA, teamB],
  submissions,
  notifications,
  transactions_ledger: transactions,
  team_achievements: teamA.team_achievements,
}

export const mockProfile = profile

// ---- chainable mock Supabase client ---------------------------------------
//
// Supports the read patterns the sponsor pages use:
//   .from(t).select(...).eq(...).order(...).limit(...)            -> awaited array
//   .from(t).select(...).eq(...).single() / .maybeSingle()       -> first row
// Filters are intentionally ignored — fixtures are tiny and fixed. Writes are
// no-ops so an accidental button click won't hard-crash the preview.

function makeBuilder(rows: unknown[]) {
  const result = { data: rows, error: null }
  const single = { data: rows[0] ?? null, error: null }
  const builder: Record<string, unknown> = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    upsert: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    is: () => builder,
    in: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    like: () => builder,
    ilike: () => builder,
    or: () => builder,
    not: () => builder,
    contains: () => builder,
    overlaps: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    single: () => Promise.resolve(single),
    maybeSingle: () => Promise.resolve(single),
    then: (resolve: (v: typeof result) => unknown) => resolve(result),
  }
  return builder
}

export function createMockSupabaseClient() {
  return {
    from(table: string) {
      return makeBuilder(FIXTURES[table] ?? [])
    },
  }
}
