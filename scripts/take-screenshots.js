const { chromium } = require('@playwright/test');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait for loader to disappear
  console.log('Waiting for loader to finish...');
  await page.waitForTimeout(4000);
  
  console.log('Capturing 1440px screenshot...');
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.screenshot({ path: 'homepage-1440.png', fullPage: true });

  console.log('Capturing 375px screenshot...');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'homepage-375.png', fullPage: true });

  await browser.close();
  console.log('Done!');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
