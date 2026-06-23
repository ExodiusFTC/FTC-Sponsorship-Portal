/**
 * Playwright global setup.
 *
 * Runs once before all test suites. Auth is now Clerk, so this:
 *   1. Bootstraps Clerk for the test run via `clerkSetup()` (loads the Clerk
 *      publishable/secret keys + provisions Testing Tokens).
 *   2. When SUPABASE_LOCAL=true, verifies the local Supabase instance is reachable
 *      (Supabase still backs Postgres + Storage).
 *   3. If an admin test account is configured, signs in with Clerk's test helper
 *      and saves the authenticated storage state to disk so individual tests can
 *      reuse a logged-in session without re-driving the login UI.
 *
 * Required env:
 *   CLERK_PUBLISHABLE_KEY / NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY
 *     — consumed by `clerkSetup()` to talk to the Clerk Frontend/Backend APIs.
 *   ADMIN_EMAIL — the seeded admin's Clerk email (e.g. admin+clerk_test@devtest.local);
 *     used to mint a server-side session token (no password needed).
 *   SUPABASE_LOCAL / NEXT_PUBLIC_SUPABASE_URL — optional local Supabase reachability check.
 */

import { chromium, type FullConfig } from '@playwright/test'
import { clerk, clerkSetup } from '@clerk/testing/playwright'

async function globalSetup(config: FullConfig) {
  // Bootstrap Clerk testing for the whole run (loads keys, provisions Testing Tokens).
  // This is required before any Clerk test helper (clerk.signIn / setupClerkTestingToken)
  // can be used in the specs.
  await clerkSetup()

  if (process.env.SUPABASE_LOCAL) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL must be set when SUPABASE_LOCAL=true')
    }

    // Quick reachability check — if Supabase is down, fail fast with a clear message
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' },
    }).catch(() => null)

    if (!res || !res.ok) {
      throw new Error(
        `Local Supabase is not reachable at ${supabaseUrl}. Run \`supabase start\` first.`
      )
    }

    console.log('✓ Local Supabase reachable')
  }

  // Save an authenticated admin Clerk session to disk so individual tests can reuse
  // it without re-driving the login UI (speeds up the suite significantly).
  // `clerk.signIn` with `emailAddress` mints a server-side token and bypasses all
  // verification steps, so no password is needed here.
  if (process.env.ADMIN_EMAIL) {
    const baseURL = config.projects[0].use.baseURL ?? 'http://localhost:3000'
    const browser = await chromium.launch()
    const page = await browser.newPage({ baseURL })

    // Clerk needs the app loaded (so window.Clerk is available) before signing in.
    await page.goto('/')
    await clerk.signIn({
      page,
      signInParams: { strategy: 'password', identifier: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD ?? '' },
    })

    // Land on an admin-only page to confirm the session took.
    await page.goto('/moderation')
    await page.waitForURL(/\/moderation/, { timeout: 15_000 }).catch(() => {})

    await page.context().storageState({ path: 'tests/.auth/admin.json' })
    await browser.close()
    console.log('✓ Admin Clerk session saved to tests/.auth/admin.json')
  }
}

export default globalSetup
