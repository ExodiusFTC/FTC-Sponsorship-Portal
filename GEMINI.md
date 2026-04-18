# Project Matchmaker — FTC Sponsorship Portal

## Foundational Mandates & Non-Negotiables
These four rules take absolute precedence over all other architectural and feature decisions:

1.  **COPPA Compliance**: Only verified adults (coaches/advisors) may create accounts. No student PII (Personally Identifiable Information) may ever be collected, stored, or exposed.
2.  **Admin-Gatekept Dispatch**: No email leaves the platform without Admin approval. The review queue is the single chokepoint for all outreach.
3.  **Sponsor Capacity Integrity**: Sponsors have funding caps that must be respected; inactive or capped sponsors must be invisible to teams during the pitch creation/targeting phase.
4.  **Data Architecture Distinction**: Strictly prioritize the distinction between Global Team Data (the Portfolio) and Submission-Specific Data (custom pitch alignment, specific needs, local connection).

---

## 1. System Architecture

### Recommended Tech Stack
| Layer | Choice | Justification |
|---|---|---|
| **Frontend** | **Next.js 16 (App Router) + React 19 + TypeScript** | Server Components, Server Actions, and React 19 features. |
| **Styling / UI** | **Tailwind CSS 4 + shadcn/ui + Radix primitives** | Fast iteration with accessible, ownable components. |
| **Backend** | **Next.js Route Handlers + Server Actions** | Unified server-side logic and validation. |
| **Database** | **Supabase (managed Postgres)** | RLS for security; JSONB for flexible pitch data. |
| **Auth** | **Supabase Auth** | Email/Password + Magic Link + custom `coach_verified` flag. |
| **File Storage** | **Supabase Storage** | Credentials and team media with RLS-backed signed URLs. |
| **Email Dispatch** | **Resend** + **React Email** | Reliable, design-consistent dispatch with tracking. |
| **Validation** | **Zod** | End-to-end type safety and schema validation. |
| **Forms** | **React Hook Form + Zod resolver** | Robust handling of complex, multi-step forms. |
| **Rate Limiting** | **Upstash Redis** | Protection against abuse on key endpoints. |

### Key Architectural Principles
- **RLS-first authorization**: Security is enforced at the database layer (Postgres RLS).
- **Server Actions over client mutations**: All writes must be server-side and validated via Zod.
- **Immutable audit log**: All admin actions (approve, reject, dispatch) must be logged to an append-only `audit_log` table.
- **No public student data paths**: Zero columns for student PII; enforced by schema constraints and documented in `SECURITY.md`.
- **Idempotent Dispatch**: Each pitch outreach has a unique `dispatch_id` to prevent double-sending.

---

## 2. Data Models (Postgres / Supabase)
- `profiles`: Extends `auth.users` (coach, admin roles, `coach_verified` flag).
- `teams`: Team data, 501(c)(3) status, organization info.
- `team_achievements`: 1:N team historical performance.
- `sponsors`: Funding caps, industry, contact info, status (active/inactive).
- `pitches`: The core pitch blob, financial ask (cents), status (draft -> dispatched).
- `pitch_sponsor_targets`: M:N junction for dispatch tracking and status.
- `sponsor_applications`: Public opt-in queue for new sponsors.
- `audit_log`: Append-only record of sensitive system actions.

---

## 3. Implementation Roadmap

### Chunk 1 — Foundations: Project Scaffolding, Auth, and Database
- [x] Initialize Next.js 16 + TypeScript + Tailwind + shadcn/ui.
- [x] Provision Supabase; apply initial migrations (RLS enabled).
- [x] Implement coach signup + credentials upload workflow.
- [x] Setup seed scripts and core `lib/supabase/` infrastructure.

### Chunk 2 — Team Profiles & The Incubator
- [x] Coach onboarding wizard (Existing vs. Incubator).
- [x] FIRST team-number validator/cache.
- [x] Team profile CRUD (mission, achievements, logo).

### Chunk 3 — The Smart Pitch Builder
- [x] Multi-step form (RHF + Zod) with drafts.
- [x] Dynamic line-item calculation.
- [x] Media uploader (Supabase Storage).
- [x] React Email template rendering.

### Chunk 4 — Sponsor Database & Targeting UI
- [x] Admin CRUD for sponsors.
- [x] Public sponsor opt-in page (`/sponsors/apply`).
- [x] Team-facing sponsor browser (filtered by RLS and capacity).

### Chunk 5 — Admin Review Engine & SMTP Dispatch
- [x] Admin dashboard and review queue.
- [x] Approve & Dispatch workflow (Resend integration).
- [x] Webhook handler for tracking (bounces/opens).

### Chunk 6 — Analytics, Compliance Hardening & Launch Prep
- [/] Admin analytics dashboard.
- [ ] COPPA/legal artifact completion (TOS, Privacy Policy).
- [x] Rate limiting and automated security testing (pgtap, Playwright).

---

## 4. Verification Strategy
- **RLS Tests**: Use `pgtap` to verify cross-tenant data isolation.
- **Unit Testing**: Vitest for Zod schemas and financial logic.
- **E2E Testing**: Playwright for the "Golden Path" (Signup -> Pitch -> Approval -> Dispatch).
- **Security Reviews**: Manual and automated passes at key milestones.
