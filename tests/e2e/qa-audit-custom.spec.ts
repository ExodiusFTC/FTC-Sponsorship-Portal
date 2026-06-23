import { test, expect, type Page } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import * as fs from 'fs'
import * as path from 'path'

// Seeded Clerk test personas (see scripts/seed-test-accounts.mjs).
const PERSONAS = {
  coach: { email: 'coach+clerk_test@devtest.local', password: 'CoachTest123!' },
  admin: { email: 'admin+clerk_test@devtest.local', password: 'AdminTest123!' },
  sponsor: { email: 'sponsor+clerk_test@devtest.local', password: 'SponsorTest123!' },
}

// Sign in via Clerk's test helper (programmatic — no UI form driving). Clears any
// existing session first so persona switches don't carry over cookies, then injects
// a Testing Token to bypass bot detection and signs in with password strategy.
async function signInAs(page: Page, persona: { email: string; password: string }) {
  await setupClerkTestingToken({ page })
  // Clerk needs the app loaded (window.Clerk available) before sign-out/sign-in.
  await page.goto('/')
  await clerk.signOut({ page }).catch(() => {})
  await clerk.signIn({
    page,
    signInParams: { strategy: 'password', identifier: persona.email, password: persona.password },
  })
}

// Global logger to keep track of bugs found during testing
const qaBugs: Array<{ page: string; type: string; desc: string; details?: string }> = []
const consoleLogs: string[] = []

function logBug(pageUrl: string, type: 'RED' | 'YELLOW' | 'GREEN', desc: string, details?: string) {
  qaBugs.push({ page: pageUrl, type, desc, details })
  console.log(`[BUG DETECTED - ${type}] On ${pageUrl}: ${desc}`);
  if (details) console.log(`  Details: ${details}`);
}

// Helper to hook page errors
function setupPageListeners(page: Page) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text()
      // Ignore known warnings or console noises if needed
      if (!txt.includes('Prisma instrumentation') && !txt.includes('webpack')) {
        consoleLogs.push(`[Console Error] [${page.url()}]: ${txt}`)
      }
    }
  })
  page.on('pageerror', err => {
    consoleLogs.push(`[Page Runtime Exception] [${page.url()}]: ${err.stack || err.message}`)
    logBug(page.url(), 'RED', 'Runtime JS Exception', err.stack || err.message)
  })
}

test.describe('Exhaustive QA Audit Flow', () => {
  test.setTimeout(300000) // 5 minutes for the whole flow

  test('Perform Comprehensive Web App Testing', async ({ page }, testInfo) => {
    // This audit mutates shared DB state (the cross-persona flow seeds/approves
    // submissions) and writes a single results file. Running it across all configured
    // browser projects in parallel collides on that shared state, so pin it to one project.
    test.skip(testInfo.project.name !== 'chromium', 'Single-project audit (shared DB state)')

    setupPageListeners(page)

    // ==========================================
    // PHASE 1: Public Pages
    // ==========================================
    console.log('--- Phase 1: Checking Public Pages ---')
    
    // Landing page
    await page.goto('/')
    await expect(page).toHaveTitle(/Sponsorship/i)
    
    // Check legal terms
    await page.goto('/legal/terms')
    await expect(page.locator('h1').first()).toContainText(/terms/i)
    
    // Check legal privacy
    await page.goto('/legal/privacy')
    await expect(page.locator('h1').first()).toContainText(/privacy/i)
    
    // Check login page rendering (Clerk-driven login form)
    await page.goto('/login')
    await expect(page.locator('input[type="password"]').first()).toBeVisible()

    // ==========================================
    // PHASE 2: Admin Persona
    // ==========================================
    console.log('--- Phase 2: Logging in as Admin ---')
    await signInAs(page, PERSONAS.admin)
    await page.goto('/admin')
    await page.waitForURL(url => url.pathname.includes('admin') || url.pathname.includes('dashboard'), { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(1000)

    // Now on admin dashboard
    await page.goto('/admin')
    await page.waitForTimeout(1000)
    if (!page.url().includes('/admin')) {
      logBug(page.url(), 'RED', 'Failed to reach Admin Dashboard after login')
    } else {
      console.log('Successfully reached Admin Dashboard.')
    }

    // Visit all Admin pages
    const adminPages = [
      { path: '/admin', title: 'Dashboard' },
      { path: '/moderation', title: 'Moderation' },
      { path: '/sponsors', title: 'Sponsors' },
      { path: '/coaches', title: 'Coaches' },
      { path: '/applications', title: 'Applications' },
      { path: '/analytics', title: 'Analytics' },
      { path: '/admin/audit', title: 'Audit' },
      { path: '/settings', title: 'Settings' }
    ]

    for (const ap of adminPages) {
      console.log(`Visiting Admin Page: ${ap.path}`)
      try {
        await page.goto(ap.path)
        await page.waitForTimeout(1000)
        // Check for error boundary or crash
        const text = await page.innerText('body')
        if (text.includes('Application error:') || text.includes('Unhandled Runtime Error') || text.includes('Internal Server Error') || text.includes('An unexpected error occurred') || text.includes('Server Error')) {
          logBug(ap.path, 'RED', `Page crashed or returned server error on load`, text.substring(0, 300))
        }
      } catch (err: any) {
        logBug(ap.path, 'RED', `Failed to load admin page: ${err.message}`)
      }
    }

    // ==========================================
    // PHASE 3: Coach Persona
    // ==========================================
    console.log('--- Phase 3: Logging in as Coach ---')
    await signInAs(page, PERSONAS.coach)
    await page.goto('/dashboard')
    await page.waitForURL(/\/dashboard/, { timeout: 10000 }).catch(() => {})

    if (!page.url().includes('/dashboard')) {
      logBug(page.url(), 'RED', 'Failed to reach Coach Dashboard after login')
    } else {
      console.log('Successfully reached Coach Dashboard.')
    }

    // Check Coach Tabs
    const coachTabs = [
      'overview', 'portfolio', 'find-sponsors', 'submissions', 'inbox', 'insights', 'ledger', 'settings'
    ]

    for (const tab of coachTabs) {
      console.log(`Checking Coach Dashboard Tab: ${tab}`)
      try {
        await page.goto(`/dashboard?tab=${tab}`)
        await page.waitForTimeout(1000)
        const text = await page.innerText('body')
        if (text.includes('Application error:') || text.includes('Unhandled Runtime Error') || text.includes('Internal Server Error') || text.includes('An unexpected error occurred') || text.includes('Server Error')) {
          logBug(`/dashboard?tab=${tab}`, 'RED', `Coach tab crashed on load`, text.substring(0, 300))
        }
      } catch (err: any) {
        logBug(`/dashboard?tab=${tab}`, 'RED', `Failed to load coach tab: ${err.message}`)
      }
    }

    // Check additional coach pages
    const coachPages = ['/team/edit', '/team/achievements/new', '/submissions/new']
    for (const cp of coachPages) {
      console.log(`Visiting Coach Page: ${cp}`)
      try {
        await page.goto(cp)
        await page.waitForTimeout(1000)
        const text = await page.innerText('body')
        if (text.includes('Application error:') || text.includes('Unhandled Runtime Error') || text.includes('Internal Server Error') || text.includes('An unexpected error occurred') || text.includes('Server Error')) {
          logBug(cp, 'RED', `Coach page crashed on load`, text.substring(0, 300))
        }
      } catch (err: any) {
        logBug(cp, 'RED', `Failed to load coach page: ${err.message}`)
      }
    }

    // ==========================================
    // PHASE 4: Sponsor Persona
    // ==========================================
    console.log('--- Phase 4: Logging in as Sponsor ---')
    await signInAs(page, PERSONAS.sponsor)
    await page.goto('/sponsor/dashboard')
    await page.waitForURL(/\/sponsor\/dashboard/, { timeout: 10000 }).catch(() => {})

    if (!page.url().includes('/sponsor/dashboard')) {
      logBug(page.url(), 'RED', 'Failed to reach Sponsor Dashboard after login')
    } else {
      console.log('Successfully reached Sponsor Dashboard.')
    }

    const sponsorPages = [
      '/sponsor/dashboard',
      '/sponsor/submissions',
      '/sponsor/inbox',
      '/sponsor/funding',
      '/sponsor/settings'
    ]

    for (const sp of sponsorPages) {
      console.log(`Visiting Sponsor Page: ${sp}`)
      try {
        await page.goto(sp)
        await page.waitForTimeout(1000)
        const text = await page.innerText('body')
        if (text.includes('Application error:') || text.includes('Unhandled Runtime Error') || text.includes('Internal Server Error') || text.includes('An unexpected error occurred') || text.includes('Server Error')) {
          logBug(sp, 'RED', `Sponsor page crashed on load`, text.substring(0, 300))
        }
      } catch (err: any) {
        logBug(sp, 'RED', `Failed to load sponsor page: ${err.message}`)
      }
    }

    // ==========================================
    // PHASE 5: Cross-Persona Integration Flow
    // ==========================================
    console.log('--- Phase 5: Testing Cross-Persona Flow ---')
    try {
      // 1. Coach creates and submits a pitch
      console.log('[Flow] Logging in as Coach...');
      await signInAs(page, PERSONAS.coach)
      await page.goto('/dashboard')
      await page.waitForURL(/\/dashboard/, { timeout: 10000 })

      console.log('[Flow] Creating new pitch submission...');
      await page.goto('/submissions/new')
      await page.waitForTimeout(1000)

      // Select sponsor "dev testing"
      await page.click('text=Select a sponsor')
      await page.waitForTimeout(500)
      await page.click('text=dev testing')
      await page.waitForTimeout(500)

      // Fill rich text editors
      const alignmentText = 'This is a test alignment message that is at least fifty characters long to satisfy the validation requirements.'
      const needsText = 'This is a test needs statement that is at least fifty characters long to satisfy the validation requirements.'
      const editors = await page.locator('.ProseMirror').all()
      if (editors.length >= 2) {
        await editors[0].fill(alignmentText)
        await editors[1].fill(needsText)
      } else {
        logBug('/submissions/new', 'RED', 'Could not locate 2 rich text editor fields in pitch builder')
      }

      await page.fill('textarea[placeholder*="connections"]', 'No local connections to report.')
      
      console.log('[Flow] Submitting pitch for review...');
      await page.click('text=Submit for Review')
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
      console.log('[Flow] Pitch submitted successfully by Coach.');

      // 2. Admin logs in and approves the pitch
      console.log('[Flow] Logging in as Admin...');
      await signInAs(page, PERSONAS.admin)
      await page.goto('/admin')
      await page.waitForURL(/\/admin/, { timeout: 10000 })

      console.log('[Flow] Navigating to Admin Moderation Queue...');
      await page.goto('/moderation')
      await page.waitForTimeout(1000)

      // Verify the submission is visible
      const hasSubmission = await page.getByText(alignmentText).isVisible()
      if (!hasSubmission) {
        logBug('/moderation', 'RED', 'Submitted pitch not visible in Admin Review Queue')
      } else {
        console.log('[Flow] Pitch found in Admin Review Queue. Approving...');
        const approveBtn = page.getByRole('button', { name: 'Approve & Dispatch to Sponsor' })
        if (await approveBtn.isVisible()) {
          await approveBtn.click({ force: true })
          await page.waitForTimeout(1000)
          
          const confirmBtn = page.getByRole('button', { name: 'Confirm — Approve & Dispatch' })
          await expect(confirmBtn).toBeVisible()
          await confirmBtn.click()

          // The approved pitch should leave the moderation queue
          await expect(page.getByText(alignmentText)).not.toBeVisible({ timeout: 15000 })
          console.log('[Flow] Pitch approved by Admin.');
        } else {
          logBug('/moderation', 'RED', 'Approve & Dispatch button not found/visible')
        }
      }

      // 3. Sponsor verifies receipt
      console.log('[Flow] Logging in as Sponsor...');
      await signInAs(page, PERSONAS.sponsor)
      await page.goto('/sponsor/dashboard')
      await page.waitForURL(/\/sponsor\/dashboard/, { timeout: 10000 })

      console.log('[Flow] Checking Sponsor Submissions...');
      await page.goto('/sponsor/submissions')
      await page.waitForTimeout(1000)

      // Verify submission is received
      const hasReceived = await page.getByText('Dev Test Team').isVisible()
      if (!hasReceived) {
        logBug('/sponsor/submissions', 'RED', 'Approved submission not found in Sponsor dashboard')
      } else {
        console.log('[Flow] Successfully verified submission receipt in Sponsor Dashboard!');
      }
    } catch (flowErr: any) {
      logBug(page.url(), 'RED', `Cross-persona integration flow failed with exception: ${flowErr.message}`, flowErr.stack)
    }

    // Write audit results
    const results = {
      bugs: qaBugs,
      logs: consoleLogs
    }
    fs.mkdirSync('test-results', { recursive: true })
    fs.writeFileSync('test-results/qa-audit-raw-results.json', JSON.stringify(results, null, 2))
    console.log('QA Audit test run completed. Results written to test-results/qa-audit-raw-results.json');

    // Fail the test if the audit detected any RED-severity issues. Without this the run
    // reports green even when pages crash or the cross-persona flow fails, defeating the audit.
    const redBugs = qaBugs.filter(b => b.type === 'RED')
    expect(
      redBugs,
      `QA audit found ${redBugs.length} RED issue(s):\n${redBugs.map(b => `  - [${b.page}] ${b.desc}${b.details ? ` (${b.details})` : ''}`).join('\n')}`
    ).toHaveLength(0)
  })
})
