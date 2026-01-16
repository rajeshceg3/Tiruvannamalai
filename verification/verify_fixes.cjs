
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to homepage
    await page.goto('http://localhost:5000');

    // Verify Title
    const title = await page.title();
    console.log(`Page title: ${title}`);

    if (title !== 'Sacred Steps') {
      throw new Error(`Expected title "Sacred Steps", got "${title}"`);
    }

    // Take screenshot
    const screenshotPath = path.join(__dirname, 'verification.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to ${screenshotPath}`);

  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
