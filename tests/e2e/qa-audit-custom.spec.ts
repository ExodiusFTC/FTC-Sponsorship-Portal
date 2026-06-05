import { test, expect, type Page } from '@playwright/test'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

// Base32 decoder for TOTP
function base32Decode(str: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  str = str.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let val = 0;
  let count = 0;
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const idx = alphabet.indexOf(str[i]);
    if (idx === -1) continue;
    val = (val << 5) | idx;
    count += 5;
    if (count >= 8) {
      bytes.push((val >>> (count - 8)) & 255);
      count -= 8;
    }
  }
  return Buffer.from(bytes);
}

// Generates TOTP code from secret
function generateTOTP(secret: string): string {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);
  
  const buffer = Buffer.alloc(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    buffer[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }
  
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(buffer);
  const hmacResult = hmac.digest();
  
  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);
  
  const otp = code % 1000000;
  return otp.toString().padStart(6, '0');
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

// Global variable to save MFA secret across test flows
let adminMfaSecret = ''

test.describe('Exhaustive QA Audit Flow', () => {
  test.setTimeout(300000) // 5 minutes for the whole flow

  test('Perform Comprehensive Web App Testing', async ({ page }) => {
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
    
    // Check login page rendering
    await page.goto('/login')
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()

    // ==========================================
    // PHASE 2: Admin Persona
    // ==========================================
    console.log('--- Phase 2: Logging in as Admin ---')
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@devtest.local')
    await page.fill('input[name="password"]', 'AdminTest123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(url => url.pathname.includes('security') || url.pathname.includes('mfa') || url.pathname.includes('admin'), { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(1000)

    // MFA setup / redirect handling
    const currentUrl = page.url()
    if (currentUrl.includes('/admin/security')) {
      console.log('MFA Setup redirection detected. Enrolling TOTP factor...');
      // Wait for manual entry secret key
      await page.waitForSelector('.select-all')
      const secretText = await page.locator('.select-all').innerText()
      adminMfaSecret = secretText.trim()
      console.log(`Extracted admin MFA secret: ${adminMfaSecret}`)

      // Generate and verify code
      const code = generateTOTP(adminMfaSecret)
      await page.fill('input[placeholder="000 000"]', code)
      await page.click('text=Verify & activate 2FA')
      await page.waitForTimeout(2000)
    } else if (currentUrl.includes('/mfa')) {
      console.log('MFA Challenge redirection detected. Entering TOTP code...');
      if (!adminMfaSecret) {
        logBug(currentUrl, 'RED', 'Admin MFA is already enrolled but secret is unknown. Reset database to test.')
        throw new Error('MFA already enrolled, cannot continue admin tests.')
      }
      const code = generateTOTP(adminMfaSecret)
      await page.fill('input[placeholder="000 000"]', code)
      await page.click('text=Verify')
      await page.waitForTimeout(2000)
    }

    // Now on admin dashboard
    await page.goto('/admin')
    await page.waitForTimeout(1000)
    if (!page.url().includes('/admin')) {
      logBug(page.url(), 'RED', 'Failed to reach Admin Dashboard after login/MFA')
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
      { path: '/admin/security', title: 'Security' },
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
    // Sign out first by clearing cookies
    await page.context().clearCookies()
    await page.goto('/')
    await page.waitForTimeout(1000)

    await page.goto('/login')
    await page.fill('input[name="email"]', 'coach@devtest.local')
    await page.fill('input[name="password"]', 'CoachTest123!')
    await page.click('button[type="submit"]')
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
    await page.context().clearCookies()
    await page.goto('/login')
    await page.fill('input[name="email"]', 'sponsor@devtest.local')
    await page.fill('input[name="password"]', 'SponsorTest123!')
    await page.click('button[type="submit"]')
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
      await page.context().clearCookies()
      await page.goto('/login')
      await page.fill('input[name="email"]', 'coach@devtest.local')
      await page.fill('input[name="password"]', 'CoachTest123!')
      await page.click('button[type="submit"]')
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
      await page.context().clearCookies()
      await page.goto('/login')
      await page.fill('input[name="email"]', 'admin@devtest.local')
      await page.fill('input[name="password"]', 'AdminTest123!')
      await page.click('button[type="submit"]')
      
      // Wait for MFA challenge
      await page.waitForURL(/\/mfa/, { timeout: 10000 })
      const mfaCode = generateTOTP(adminMfaSecret)
      await page.fill('input[placeholder="000 000"]', mfaCode)
      await page.click('text=Verify')
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
        const approveBtn = page.getByRole('button', { name: /Approve & Dispatch/i })
        if (await approveBtn.isVisible()) {
          await approveBtn.click({ force: true })
          // The approved pitch should leave the moderation queue
          await expect(page.getByText(alignmentText)).not.toBeVisible({ timeout: 15000 })
          console.log('[Flow] Pitch approved by Admin.');
        } else {
          logBug('/moderation', 'RED', 'Approve & Dispatch button not found/visible')
        }
      }

      // 3. Sponsor verifies receipt
      console.log('[Flow] Logging in as Sponsor...');
      await page.context().clearCookies()
      await page.goto('/login')
      await page.fill('input[name="email"]', 'sponsor@devtest.local')
      await page.fill('input[name="password"]', 'SponsorTest123!')
      await page.click('button[type="submit"]')
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
    fs.writeFileSync('test-results/qa-audit-raw-results.json', JSON.stringify(results, null, 2))
    console.log('QA Audit test run completed. Results written to test-results/qa-audit-raw-results.json');
  })
})
