import { test, expect } from '@playwright/test'

test.describe('Public pages (no auth required)', () => {
  test('landing page shows hero and CTAs', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByRole('link', { name: /coaches/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /become a sponsor/i })).toBeVisible()
  })

  test('landing page links to /signup and /sponsors/apply', async ({ page }) => {
    await page.goto('/')
    const coachLink = page.getByRole('link', { name: /coaches/i })
    await expect(coachLink).toHaveAttribute('href', '/signup')
    const sponsorLink = page.getByRole('link', { name: /become a sponsor/i })
    await expect(sponsorLink).toHaveAttribute('href', '/sponsors/apply')
  })

  test('terms of service page renders', async ({ page }) => {
    await page.goto('/legal/terms')
    await expect(page.getByRole('heading', { name: /terms of service/i })).toBeVisible()
    await expect(page.getByText(/acceptance of terms/i)).toBeVisible()
  })

  test('privacy policy page renders', async ({ page }) => {
    await page.goto('/legal/privacy')
    await expect(page.getByRole('heading', { name: /privacy/i })).toBeVisible()
  })

  test('sponsor application page renders form', async ({ page }) => {
    await page.goto('/sponsors/apply')
    await expect(page.getByRole('heading', { name: /become a sponsor/i })).toBeVisible()
    await expect(page.getByLabel(/company name/i)).toBeVisible()
    await expect(page.getByLabel(/contact name/i)).toBeVisible()
    await expect(page.getByLabel(/contact email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /submit application/i })).toBeVisible()
  })

  test('sponsor apply form validates empty submission', async ({ page }) => {
    await page.goto('/sponsors/apply')
    await page.getByRole('button', { name: /submit application/i }).click()
    // RHF + zod validation should show inline messages without a page navigation
    await expect(page).toHaveURL(/\/sponsors\/apply/)
  })

  test('auth-code-error page renders', async ({ page }) => {
    await page.goto('/auth/auth-code-error')
    await expect(page.getByRole('heading', { name: /link expired/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /back to sign in/i })).toBeVisible()
  })

  test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated access to /moderation redirects to /login', async ({ page }) => {
    await page.goto('/moderation')
    await expect(page).toHaveURL(/\/login/)
  })
})
