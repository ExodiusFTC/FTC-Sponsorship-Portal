# FTC Sponsorship Portal

## Core Mandates
- **COPPA Compliance**: No student PII collected/exposed. Verified adult coaches only.
- **Admin-Gatekept**: All outbound emails require Admin approval via review queue.
- **Capacity Integrity**: Sponsor funding caps are strictly enforced.
- **Data Architecture Distinction**: Strictly prioritize the distinction between Global Team Data (the Portfolio) and Submission-Specific Data (custom pitch alignment, specific needs, local connection).

## Tech Stack & Architecture
- **Next.js 16.2** (App Router), React 19, Tailwind v4, shadcn/ui.
  - *Warning*: Next.js 15+ has breaking changes. Consult `node_modules/next/dist/docs/` for current API conventions.
- **Supabase** (Postgres, Auth, Storage). Security enforced via database RLS.
- **Backend**: Server Actions for all mutations (`app/actions/`), validated with Zod.
- **Email**: Resend + React Email.
- **Audit**: All sensitive admin actions append to `audit_log`.

## Commands
- Dev: `npm run dev`, `npm run build`
- Validate: `npm run lint`, `npm run typecheck`
- Test: `npx playwright test` (E2E), Vitest (Unit), pgtap (RLS).
