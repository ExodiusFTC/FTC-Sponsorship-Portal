/**
 * Golden Path E2E: Signup → Onboarding → Pitch → Admin Approval
 *
 * Prerequisites for this suite to run fully:
 *   1. Local Supabase running (`supabase start`)
 *   2. Email confirmations disabled in local Supabase config
 *      (set "enable_confirmations = false" in supabase/config.toml)
 *   3. An admin account seeded and stored in ADMIN_EMAIL / ADMIN_PASSWORD env vars
 *   4. `npm run dev` running on port 3000 (webServer in playwright.config.ts handles this)
 */

import { test, expect, type Page } from '@playwright/test'

const timestamp = Date.now()
const COACH_EMAIL = `coach_${timestamp}@test.local`
const COACH_PASSWORD = 'TestPass123!'
const COACH_NAME = `Test Coach ${timestamp}`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function signUp(page: Page, name: string, email: string, password: string) {
  await page.goto('/signup')
  await page.getByLabel(/full name/i).fill(name)
  await page.getByLabel(/^email/i).fill(email)
  await page.getByLabel(/^password/i).fill(password)
  await page.getByLabel(/confirm password/i).fill(password)
  await page.getByRole('button', { name: /create account/i }).click()
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
}

// ---------------------------------------------------------------------------
// Suites
// ---------------------------------------------------------------------------

test.describe('Golden Path — Coach Flow', () => {
  test.skip(
    !process.env.SUPABASE_LOCAL,
    'Set SUPABASE_LOCAL=true and run with local Supabase to enable full E2E tests'
  )

  test('1. Coach signs up and lands on verify-email or awaiting-verification', async ({ page }) => {
    await signUp(page, COACH_NAME, COACH_EMAIL, COACH_PASSWORD)
    await expect(page).toHaveURL(/\/(verify-email|awaiting-verification|dashboard)/, {
      timeout: 10_000,
    })
  })

  test('2. After admin verification, coach sees dashboard after login', async ({ page }) => {
    // This test assumes the coach was pre-verified by admin via DB:
    //   UPDATE profiles SET coach_verified = true WHERE email = '...'
    await signIn(page, COACH_EMAIL, COACH_PASSWORD)
    await expect(page).toHaveURL(/\/(dashboard)/, { timeout: 10_000 })
  })

  test('3. Coach creates and saves a draft pitch', async ({ page }) => {
    await signIn(page, COACH_EMAIL, COACH_PASSWORD)
    await page.waitForURL(/\/dashboard/)

    await page.goto('/submissions/new')
    await expect(page.getByText(/create pitch/i)).toBeVisible()

    await page.getByLabel(/pitch title/i).fill('2025 Championship Fund')
    await page.getByLabel(/executive summary/i).fill(
      'We need funds to compete at the state championship.'
    )
    await page.getByLabel(/cost explanation/i).fill('Travel, registration, and spare parts.')

    // Fill first line item
    const rows = page.locator('input[placeholder*="Robot Parts"]')
    await rows.first().fill('Registration Fee')

    await page.getByRole('button', { name: /save as draft/i }).click()
    // Autosave indicator should appear
    await expect(page.getByText(/draft saved/i)).toBeVisible({ timeout: 5_000 })
  })

  test('5. Coach submits pitch for review', async ({ page }) => {
    await signIn(page, COACH_EMAIL, COACH_PASSWORD)
    await page.waitForURL(/\/dashboard/)

    // Find the draft pitch card and navigate to it
    const pitchLink = page.getByRole('link', { name: /2025 Championship Fund/i })
    await expect(pitchLink).toBeVisible()
    await pitchLink.click()

    await page.getByRole('button', { name: /submit for review/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
    // Pitch card should show "submitted" status
    await expect(page.getByText(/submitted/i)).toBeVisible()
  })
})

test.describe('Golden Path — Admin Flow', () => {
  test.skip(
    !process.env.SUPABASE_LOCAL || !process.env.ADMIN_EMAIL,
    'Set SUPABASE_LOCAL=true and ADMIN_EMAIL/ADMIN_PASSWORD to enable admin E2E tests'
  )

  const adminEmail = process.env.ADMIN_EMAIL ?? ''
  const adminPassword = process.env.ADMIN_PASSWORD ?? ''

  test('6. Admin sees submitted pitch in moderation queue', async ({ page }) => {
    await signIn(page, adminEmail, adminPassword)
    await expect(page).toHaveURL(/\/moderation/, { timeout: 10_000 })
    await expect(page.getByText(/2025 Championship Fund/i)).toBeVisible()
  })

  test('7. Admin approves the pitch', async ({ page }) => {
    await signIn(page, adminEmail, adminPassword)
    await page.waitForURL(/\/moderation/)

    const approveBtn = page
      .getByText(/2025 Championship Fund/i)
      .locator('..') // card
      .getByRole('button', { name: /approve/i })
    await approveBtn.click()

    // Pitch should leave the queue
    await expect(page.getByText(/2025 Championship Fund/i)).not.toBeVisible({ timeout: 8_000 })
  })

  test('8. Analytics page reflects activity', async ({ page }) => {
    await signIn(page, adminEmail, adminPassword)
    await page.goto('/analytics')
    await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible()
    // At least one stat card should have a non-zero value
    await expect(page.locator('text=/\\$[0-9]/')).toBeVisible()
  })
})
