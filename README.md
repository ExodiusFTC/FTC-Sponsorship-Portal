# Matchmaker: The Common App for FTC

A "Dynamic Portfolio" and Verified Grant Portal connecting FIRST Tech Challenge (FTC) robotics teams with verified corporate sponsors. Teams maintain a professional "Portfolio" (Global Team Data) and generate Customized Submissions with unique, trackable URLs for sponsors. Admins vet the quality of the 'Custom Pitch' fields before dispatching links to sponsors.

## Architecture

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui |
| Database & Auth | Supabase (Postgres + RLS + Auth + Storage) |
| Email Dispatch | Resend + React Email |
| Validation | Zod + React Hook Form |
| Hosting | Vercel + Supabase Cloud |

## Key Design Principles

- **RLS-first authorization** — every table enforces policy at the DB layer; app code is the second line of defense
- **Admin-gatekept dispatch** — no email leaves the platform without admin approval
- **COPPA compliance** — only verified adult coaches register; zero student PII columns in schema
- **Immutable audit log** — all admin actions are appended to `audit_log`
- **Sponsor capacity integrity** — `funding_cap_cents` / `funding_used_cents` enforced at DB level; inactive or fully-funded sponsors are invisible to coaches

## User Roles

| Role | Description |
|---|---|
| `coach` | Adult advisor who registers, builds team portfolio, creates submissions |
| `admin` | Platform operator who verifies coaches, reviews submissions, and triggers dispatch |

Sponsors have no platform login in v1 — they receive emails and reply directly to the coach.

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.9+ (for `main.py` dev launcher)
- A [Supabase](https://supabase.com) project
- A [Resend](https://resend.com) account

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup

```bash
# Apply migrations
supabase db push

# (Optional) Seed dev data
psql "$DATABASE_URL" < supabase/seed.sql
```

### Running Locally

```bash
npm install
npm run dev
```

Or use the Python launcher which also prints useful URLs:

```bash
python main.py
```

App runs at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  (auth)/          # Login, signup, verify-email, credential upload
  (coach)/         # Dashboard, team edit, submission builder, sponsor browser
  (admin)/         # Review queue, sponsor management, analytics
  api/
    webhooks/      # Resend bounce/open webhook handler
components/
  portfolio-builder/ # Multi-step submission form
  team/            # Onboarding and master portfolio forms
  sponsor/         # Sponsor application form
  ui/              # shadcn/ui primitives
lib/
  supabase/        # server.ts, client.ts, admin.ts, types.ts
  schemas/         # Zod schemas shared between client and server
  dispatch.ts      # Resend batch email dispatch logic
  ftc-roster.ts    # FTC team number validator (cached)
  env.ts           # Zod-validated environment variables
supabase/
  migrations/      # SQL migrations (RLS, triggers, views, indexes)
  seed.sql         # Dev seed data
emails/            # React Email templates
```

## Chunk Roadmap

| Chunk | Status | Description |
|---|---|---|
| 1 | Done | Scaffold, auth, DB schema, RLS, Supabase clients, seed |
| 2 | Done | Master Portfolio flow, FTC roster validator, incubator flow |
| 3 | Done | Submission builder with custom pitch alignment |
| 4 | Pending | Sponsor database, targeting UI, opt-in application |
| 5 | Done | Admin review queue and Resend dispatch |
| 6 | Pending | Analytics hardening, COPPA hardening, E2E tests, launch prep |
