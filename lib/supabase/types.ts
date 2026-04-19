// ---------------------------------------------------------------------------
// Database-level enum types
// ---------------------------------------------------------------------------

export type UserRole = 'coach' | 'admin' | 'sponsor'
export type TeamStatus = 'existing' | 'incubator'
export type SponsorStatus = 'active' | 'inactive' | 'pending_review'
export type SponsorSource = 'admin_added' | 'public_optin'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'
export type TaxStatus = '501c3' | 'School' | 'None'
export type SubmissionStatus = 'draft' | 'pending' | 'approved' | 'declined' | 'changes_requested' | 'opened' | 'bounced' | 'delivered'

// ---------------------------------------------------------------------------
// Line item type for teams.budget_items JSONB
// ---------------------------------------------------------------------------

export type BudgetItem = {
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
  sponsor_id: string | null
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
  tax_status: TaxStatus
  logo_url: string | null
  community_interest_text: string | null
  seed_funding_goals_cents: number
  technical_summary: string | null
  outreach_summary: string | null
  media_urls: string[]
  youtube_url: string | null
  budget_items: BudgetItem[]
  financial_ask_cents: number
  cad_software: string | null
  control_system: string | null
  github_link: string | null
  autonomous_description: string | null
  proudest_mechanism_name: string | null
  proudest_mechanism_problem: string | null
  proudest_mechanism_solution: string | null
  subteam_breakdown: string | null
  manufacturing_capabilities: string[]
  sensors: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visual_pitch_items: any[]
  coach_photo_url: string | null
  team_members: any[]
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

export type Submission = {
  id: string
  team_id: string
  sponsor_id: string
  custom_pitch_alignment: string | null
  specific_needs_statement: string | null
  local_connection_notes: string | null
  status: SubmissionStatus
  resend_message_id: string | null
  admin_feedback: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  submitted_at: string | null
  sent_at: string | null
  expires_at: string | null
  season: string | null
  created_at: string
  updated_at: string
}

export type SubmissionSummary = {
  id: string
  team_name: string
  owner_id: string
  company_name: string
  status: SubmissionStatus
  admin_feedback: string | null
  is_locked: boolean
  season: string | null
  financial_ask_cents: number
  created_at: string
  updated_at: string
}

export type SponsorApplication = {
  id: string
  company_name: string
  contact_name: string
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

export type Notification = {
  id: string
  recipient_id: string
  type: 'submission_declined' | 'submission_approved' | 'submission_changes_requested' | 'coach_verified' | 'general'
  title: string
  body: string | null
  submission_id: string | null
  read_at: string | null
  created_at: string
}

export type SubmissionAccessToken = {
  id: string
  submission_id: string
  token_hash: string
  expires_at: string
  used_at: string | null
  created_at: string
}

export type TransactionLedger = {
  id: string
  sponsor_id: string
  team_id: string
  submission_id: string | null
  amount_cents: number
  decision_type: 'full' | 'partial' | 'decline'
  actor_type: 'sponsor' | 'admin' | 'system'
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
  sponsor_id?: string | null
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
  tax_status?: TaxStatus
  logo_url?: string | null
  community_interest_text?: string | null
  seed_funding_goals_cents?: number
  technical_summary?: string | null
  outreach_summary?: string | null
  media_urls?: string[]
  youtube_url?: string | null
  budget_items?: BudgetItem[]
  financial_ask_cents?: number
  cad_software?: string | null
  control_system?: string | null
  github_link?: string | null
  autonomous_description?: string | null
  proudest_mechanism_name?: string | null
  proudest_mechanism_problem?: string | null
  proudest_mechanism_solution?: string | null
  subteam_breakdown?: string | null
  manufacturing_capabilities?: string[]
  sensors?: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visual_pitch_items?: any[]
  coach_photo_url?: string | null
  team_members?: any[]
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

export type SubmissionInsert = {
  team_id: string
  sponsor_id: string
  custom_pitch_alignment?: string | null
  specific_needs_statement?: string | null
  local_connection_notes?: string | null
  status?: SubmissionStatus
  resend_message_id?: string | null
  admin_feedback?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  submitted_at?: string | null
  sent_at?: string | null
  expires_at?: string | null
  season?: string | null
}

export type SponsorApplicationInsert = {
  company_name: string
  contact_name: string
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
  tax_status?: TaxStatus
  logo_url?: string | null
  community_interest_text?: string | null
  seed_funding_goals_cents?: number
  technical_summary?: string | null
  outreach_summary?: string | null
  media_urls?: string[]
  youtube_url?: string | null
  budget_items?: BudgetItem[]
  financial_ask_cents?: number
  cad_software?: string | null
  control_system?: string | null
  github_link?: string | null
  autonomous_description?: string | null
  proudest_mechanism_name?: string | null
  proudest_mechanism_problem?: string | null
  proudest_mechanism_solution?: string | null
  subteam_breakdown?: string | null
  manufacturing_capabilities?: string[]
  sensors?: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visual_pitch_items?: any[]
  coach_photo_url?: string | null
  team_members?: any[]
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

export type SubmissionUpdate = {
  team_id?: string
  sponsor_id?: string
  custom_pitch_alignment?: string | null
  specific_needs_statement?: string | null
  local_connection_notes?: string | null
  status?: SubmissionStatus
  resend_message_id?: string | null
  admin_feedback?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  submitted_at?: string | null
  sent_at?: string | null
  expires_at?: string | null
  season?: string | null
  updated_at?: string
}

export type SponsorApplicationUpdate = {
  company_name?: string
  contact_name?: string
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

// ---------------------------------------------------------------------------
// Supabase Database type — passed as generic to createClient<Database>
// ---------------------------------------------------------------------------

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
      submissions: {
        Row: Submission
        Insert: SubmissionInsert
        Update: SubmissionUpdate
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
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at' | 'read_at'>
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>
        Relationships: []
      }
      submission_access_tokens: {
        Row: SubmissionAccessToken
        Insert: Omit<SubmissionAccessToken, 'id' | 'created_at'>
        Update: Partial<Omit<SubmissionAccessToken, 'id' | 'created_at'>>
        Relationships: []
      }
      transactions_ledger: {
        Row: TransactionLedger
        Insert: Omit<TransactionLedger, 'id' | 'created_at'>
        Update: Partial<Omit<TransactionLedger, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: {
      v_sponsor_capacity: {
        Row: SponsorCapacityView
        Relationships: []
      }
      v_submission_summary: {
        Row: SubmissionSummary
        Relationships: []
      }
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_coach_verified: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      approve_submission_atomic: {
        Args: {
          p_submission_id: string
          p_admin_id: string
          p_amount_cents: number
        }
        Returns: Json
      }
      record_sponsor_decision_atomic: {
        Args: {
          p_token_hash: string
          p_decision: string
          p_partial_amount_cents: number
        }
        Returns: Json
      }
    }
    Enums: {
      user_role: UserRole
      team_status: TeamStatus
      sponsor_status: SponsorStatus
      sponsor_source: SponsorSource
      application_status: ApplicationStatus
      tax_status_type: TaxStatus
      submission_status: SubmissionStatus
    }
  }
}
