/**
 * Playwright global setup.
 *
 * Runs once before all test suites. When SUPABASE_LOCAL=true this verifies
 * the local Supabase instance is reachable; otherwise it's a no-op so CI
 * can still run the static/public-page tests.
 */

import { chromium, type FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  if (!process.env.SUPABASE_LOCAL) return

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

  // Save an authenticated admin session to disk so individual tests can reuse it
  // without re-logging in (speeds up the suite significantly).
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const browser = await chromium.launch()
    const page = await browser.newPage()

    await page.goto(`${config.projects[0].use.baseURL ?? 'http://localhost:3000'}/login`)
    await page.getByLabel(/email/i).fill(process.env.ADMIN_EMAIL)
    await page.getByLabel(/password/i).fill(process.env.ADMIN_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/moderation/, { timeout: 10_000 })

    await page.context().storageState({ path: 'tests/.auth/admin.json' })
    await browser.close()
    console.log('✓ Admin session saved to tests/.auth/admin.json')
  }
}

export default globalSetup
