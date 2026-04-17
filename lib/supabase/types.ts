// ---------------------------------------------------------------------------
// Database-level enum types
// ---------------------------------------------------------------------------

export type UserRole = 'coach' | 'admin'
export type TeamStatus = 'existing' | 'incubator'
export type SponsorStatus = 'active' | 'inactive' | 'pending_review'
export type SponsorSource = 'admin_added' | 'public_optin'
export type PitchStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'dispatched'
export type DispatchStatus = 'pending' | 'sent' | 'failed' | 'bounced' | 'opened'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

// ---------------------------------------------------------------------------
// Line item type for pitches.line_items JSONB
// ---------------------------------------------------------------------------

export type PitchLineItem = {
  label: string
  qty: number
  unit_cost_cents: number
  total_cents: number
}

// ---------------------------------------------------------------------------
// Row types — what SELECT * returns
// ---------------------------------------------------------------------------

export type Profile = {
  id: string
  role: UserRole
  full_name: string
  email: string
  coach_verified: boolean
  coach_credentials_url: string | null
  created_at: string
  updated_at: string
}

export type Team = {
  id: string
  owner_id: string
  status: TeamStatus
  ftc_team_number: number | null
  team_name: string
  organization: string | null
  city: string | null
  state: string | null
  mission_statement: string | null
  is_501c3: boolean
  logo_url: string | null
  created_at: string
  updated_at: string
}

export type TeamAchievement = {
  id: string
  team_id: string
  season: string | null
  event_name: string
  award: string | null
  description: string | null
  created_at: string
}

export type Sponsor = {
  id: string
  company_name: string
  industry: string | null
  website: string | null
  logo_url: string | null
  contact_name: string
  contact_email: string
  contact_title: string | null
  funding_cap_cents: number
  funding_used_cents: number
  status: SponsorStatus
  source: SponsorSource
  notes: string | null
  created_at: string
  updated_at: string
}

export type Pitch = {
  id: string
  team_id: string
  title: string
  summary: string | null
  financial_ask_cents: number
  cost_explanation: string | null
  line_items: PitchLineItem[]
  media_urls: string[]
  status: PitchStatus
  admin_feedback: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export type PitchSponsorTarget = {
  id: string
  pitch_id: string
  sponsor_id: string
  dispatch_status: DispatchStatus
  resend_message_id: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

export type SponsorApplication = {
  id: string
  company_name: string
  contact_email: string
  proposed_cap_cents: number
  message: string | null
  status: ApplicationStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export type AuditLog = {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ---------------------------------------------------------------------------
// Insert types — omit auto-generated fields (id, created_at, updated_at)
// Make optional fields match DB defaults or nullability
// ---------------------------------------------------------------------------

export type ProfileInsert = {
  /** FK to auth.users — required */
  id: string
  role?: UserRole
  full_name: string
  email: string
  coach_verified?: boolean
  coach_credentials_url?: string | null
}

export type TeamInsert = {
  owner_id: string
  status?: TeamStatus
  ftc_team_number?: number | null
  team_name: string
  organization?: string | null
  city?: string | null
  state?: string | null
  mission_statement?: string | null
  is_501c3?: boolean
  logo_url?: string | null
}

export type TeamAchievementInsert = {
  team_id: string
  season?: string | null
  event_name: string
  award?: string | null
  description?: string | null
}

export type SponsorInsert = {
  company_name: string
  industry?: string | null
  website?: string | null
  logo_url?: string | null
  contact_name: string
  contact_email: string
  contact_title?: string | null
  funding_cap_cents?: number
  funding_used_cents?: number
  status?: SponsorStatus
  source?: SponsorSource
  notes?: string | null
}

export type PitchInsert = {
  team_id: string
  title: string
  summary?: string | null
  financial_ask_cents?: number
  cost_explanation?: string | null
  line_items?: PitchLineItem[]
  media_urls?: string[]
  status?: PitchStatus
  admin_feedback?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
}

export type PitchSponsorTargetInsert = {
  pitch_id: string
  sponsor_id: string
  dispatch_status?: DispatchStatus
  resend_message_id?: string | null
  sent_at?: string | null
}

export type SponsorApplicationInsert = {
  company_name: string
  contact_email: string
  proposed_cap_cents?: number
  message?: string | null
  status?: ApplicationStatus
  reviewed_by?: string | null
  reviewed_at?: string | null
}

export type AuditLogInsert = {
  actor_id?: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Update types — all fields optional
// ---------------------------------------------------------------------------

export type ProfileUpdate = {
  role?: UserRole
  full_name?: string
  email?: string
  coach_verified?: boolean
  coach_credentials_url?: string | null
  updated_at?: string
}

export type TeamUpdate = {
  owner_id?: string
  status?: TeamStatus
  ftc_team_number?: number | null
  team_name?: string
  organization?: string | null
  city?: string | null
  state?: string | null
  mission_statement?: string | null
  is_501c3?: boolean
  logo_url?: string | null
  updated_at?: string
}

export type TeamAchievementUpdate = {
  team_id?: string
  season?: string | null
  event_name?: string
  award?: string | null
  description?: string | null
}

export type SponsorUpdate = {
  company_name?: string
  industry?: string | null
  website?: string | null
  logo_url?: string | null
  contact_name?: string
  contact_email?: string
  contact_title?: string | null
  funding_cap_cents?: number
  funding_used_cents?: number
  status?: SponsorStatus
  source?: SponsorSource
  notes?: string | null
  updated_at?: string
}

export type PitchUpdate = {
  team_id?: string
  title?: string
  summary?: string | null
  financial_ask_cents?: number
  cost_explanation?: string | null
  line_items?: PitchLineItem[]
  media_urls?: string[]
  status?: PitchStatus
  admin_feedback?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  updated_at?: string
}

export type PitchSponsorTargetUpdate = {
  pitch_id?: string
  sponsor_id?: string
  dispatch_status?: DispatchStatus
  resend_message_id?: string | null
  sent_at?: string | null
  updated_at?: string
}

export type SponsorApplicationUpdate = {
  company_name?: string
  contact_email?: string
  proposed_cap_cents?: number
  message?: string | null
  status?: ApplicationStatus
  reviewed_by?: string | null
  reviewed_at?: string | null
  updated_at?: string
}

// ---------------------------------------------------------------------------
// View row types
// ---------------------------------------------------------------------------

export type SponsorCapacityView = {
  id: string
  company_name: string
  status: SponsorStatus
  funding_cap_cents: number
  funding_used_cents: number
  remaining_cents: number
  utilization_pct: number
}

export type PitchSummaryView = {
  id: string
  title: string
  status: PitchStatus
  financial_ask_cents: number
  team_name: string
  owner_id: string
  target_count: number
  sent_count: number
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Supabase Database type — passed as generic to createClient<Database>
// ---------------------------------------------------------------------------

// GenericTable (from @supabase/postgrest-js) requires Relationships: []
// on every table and view, or TypeScript resolves query results to `never`.
// Row types must be `type` aliases (not `interface`) to satisfy the
// `Row: Record<string, unknown>` constraint in TypeScript 5.9+.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
        Relationships: []
      }
      teams: {
        Row: Team
        Insert: TeamInsert
        Update: TeamUpdate
        Relationships: []
      }
      team_achievements: {
        Row: TeamAchievement
        Insert: TeamAchievementInsert
        Update: TeamAchievementUpdate
        Relationships: []
      }
      sponsors: {
        Row: Sponsor
        Insert: SponsorInsert
        Update: SponsorUpdate
        Relationships: []
      }
      pitches: {
        Row: Pitch
        Insert: PitchInsert
        Update: PitchUpdate
        Relationships: []
      }
      pitch_sponsor_targets: {
        Row: PitchSponsorTarget
        Insert: PitchSponsorTargetInsert
        Update: PitchSponsorTargetUpdate
        Relationships: []
      }
      sponsor_applications: {
        Row: SponsorApplication
        Insert: SponsorApplicationInsert
        Update: SponsorApplicationUpdate
        Relationships: []
      }
      audit_log: {
        Row: AuditLog
        Insert: AuditLogInsert
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: {
      v_sponsor_capacity: {
        Row: SponsorCapacityView
        Relationships: []
      }
      v_pitch_summary: {
        Row: PitchSummaryView
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      team_status: TeamStatus
      sponsor_status: SponsorStatus
      sponsor_source: SponsorSource
      pitch_status: PitchStatus
      dispatch_status: DispatchStatus
      application_status: ApplicationStatus
    }
  }
}
