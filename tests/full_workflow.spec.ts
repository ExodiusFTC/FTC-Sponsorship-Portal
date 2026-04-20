import { test, expect } from '@playwright/test'

const ACCOUNTS = {
  admin: { email: 'admin@test.local', password: 'AdminPass123!' },
  coach: { email: 'coach@test.local', password: 'CoachPass123!' },
  sponsor: { email: 'sponsor@test.local', password: 'SponsorPass123!' },
}

test.describe('E2E Full Pipeline: Coach → Admin → Sponsor', () => {
  test('Full Lifecycle Test', async ({ page }) => {
    test.setTimeout(90000)

    // 1. Coach Creates Pitch
    console.log('--- Phase 1: Coach Submission ---')
    await page.goto('/login')
    await page.getByLabel(/email address/i).fill(ACCOUNTS.coach.email)
    await page.getByLabel(/password/i).fill(ACCOUNTS.coach.password)
    await page.getByRole('button', { name: /log in/i }).click()
    await page.waitForURL(/\/dashboard/)

    await page.goto('/submissions/new')
    await expect(page.getByText('Create Submission').first()).toBeVisible()
    
    // Select sponsor
    await page.getByRole('button', { name: /select a sponsor/i }).click()
    await page.getByRole('menuitem').first().click()
    
    const alignmentText = 'This is a test alignment message that is at least fifty characters long to satisfy the validation requirements.'
    const needsText = 'This is a test needs statement that is at least fifty characters long to satisfy the validation requirements.'
    
    await page.getByPlaceholder(/aligns with this company/i).fill(alignmentText)
    await page.getByPlaceholder(/financial or material needs/i).fill(needsText)
    
    console.log('Submitting pitch...')
    
    // Catch all console logs
    page.on('console', msg => {
      console.log(`BROWSER LOG [${msg.type()}]: ${msg.text()}`)
    })

    // Catch failed network requests
    page.on('requestfailed', request => {
      console.log(`REQUEST FAILED: ${request.url()} ${request.failure()?.errorText}`)
    })

    await page.getByRole('button', { name: /submit for review/i }).click()
    
    // Wait for redirect to dashboard which confirms successful submission
    try {
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
      console.log('✓ Pitch submitted successfully.')
    } catch (e) {
      // ... same error logging as before ...
      throw e
    }

    // Sign out before switching roles by clearing browser state
    console.log('Signing out coach (clearing state)...')
    await page.context().clearCookies()
    // Go to home to ensure we are actually signed out
    await page.goto('/')
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible({ timeout: 10000 })

    // 2. Admin Approves Pitch
    console.log('--- Phase 2: Admin Approval ---')
    await page.goto('/login')
    await expect(page.getByLabel(/email address/i)).toBeVisible({ timeout: 10000 })
    await page.getByLabel(/email address/i).fill(ACCOUNTS.admin.email)
    await page.getByLabel(/password/i).fill(ACCOUNTS.admin.password)
    await page.getByRole('button', { name: /log in/i }).click()
    await page.waitForURL(/\/admin/)
    
    await page.goto('/moderation')
    await expect(page.getByText('Review Queue')).toBeVisible()
    
    // Find our specific submission
    await expect(page.getByText(alignmentText)).toBeVisible({ timeout: 10000 })
    
    console.log('Approving pitch...')
    const approveBtn = page.getByRole('button', { name: /Approve & Dispatch to Sponsor/i })
    await expect(approveBtn).toBeEnabled()
    await approveBtn.click({ force: true })
    
    // Check if it enters processing state
    await expect(page.getByText(/Processing/i)).toBeVisible({ timeout: 5000 }).catch(() => console.log('Did not see "Processing..." state'))

    // Check for errors in the UI if approval doesn't show success immediately
    try {
      // Verify success message - increase timeout as this involves multiple DB writes + email dispatch
      await expect(page.getByText(/Approved & dispatched to sponsor/i)).toBeVisible({ timeout: 20000 })
      console.log('✓ Pitch approved and dispatched.')
    } catch (e) {
      const errorMsg = await page.locator('[data-slot="alert"]').first().innerText().catch(() => 'No alert found')
      console.error('Approval failed. UI Error:', errorMsg)
      // Check for any console errors that might have happened on the server
      throw e
    }

    // Sign out before switching roles by clearing browser state
    console.log('Signing out admin (clearing state)...')
    await page.context().clearCookies()
    await page.goto('/')
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible({ timeout: 10000 })

    // 3. Sponsor Verifies Inbox
    console.log('--- Phase 3: Sponsor Inbox Verification ---')
    await page.goto('/login')
    await expect(page.getByLabel(/email address/i)).toBeVisible({ timeout: 10000 })
    await page.getByLabel(/email address/i).fill(ACCOUNTS.sponsor.email)
    await page.getByLabel(/password/i).fill(ACCOUNTS.sponsor.password)
    await page.getByRole('button', { name: /log in/i }).click()
    
    // We expect a redirect to /sponsor/dashboard
    await page.waitForURL(/\/sponsor\/dashboard/, { timeout: 20000 })
    
    // Navigate to inbox/submissions
    await page.goto('/sponsor/submissions') 
    
    // Check if the submission appears
    // The specificNeedsText is long, so we check for a subset of it or the team name
    await expect(page.getByText('Dev Testing Team').or(page.getByText('test alignment message'))).toBeVisible({ timeout: 10000 })
    console.log('✓ Submission found in Sponsor inbox.')
  })
})
