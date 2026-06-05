import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';

test('Golden Path E2E Test', async ({ page }) => {
  test.setTimeout(120000);

  // 1. Log in as coach
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', 'coach@test.local');
  await page.fill('input[name="password"]', 'SponsorPass123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/);

  // 2. Go to Find Sponsors
  await page.goto('http://localhost:3000/sponsors/browse');
  
  try {
    await page.waitForSelector('text=Pitch this sponsor', { timeout: 10000 });
    await page.click('text=Pitch this sponsor');
  } catch (e) {
    const html = await page.content();
    writeFileSync('test-results/failed-html.html', html);
    console.log("FAILED TO FIND SPONSOR. Saved HTML to test-results/failed-html.html");
    throw e;
  }
  
  // 3. Create Pitch
  await expect(page).toHaveURL(/.*submissions\/new.*/);
  
  // Fill out the specific pitch details
  // Wait for TipTap editors to load
  await page.waitForTimeout(2000);
  
  // Fill first rich text editor (Custom Pitch Alignment)
  const editors = await page.locator('.ProseMirror').all();
  if (editors.length > 0) {
    await editors[0].fill('Random pitch alignment text');
  }
  if (editors.length > 1) {
    await editors[1].fill('Random specific needs text');
  }
  
  // Submit pitch
  await page.click('text=Submit'); // Guessing the button text
  
  // 4. Sign out
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForSelector('button:has(.lucide-user)', { timeout: 5000 }).catch(() => {}); // Try to find avatar trigger
  const trigger = await page.locator('button[aria-haspopup="menu"]').first();
  if (await trigger.isVisible()) {
    await trigger.click();
  }
  await page.click('text=Sign out');
});
