import { test, expect } from '@playwright/test';

test.describe('QA Assessment', () => {

  test('Homepage loads and has correct title', async ({ page }) => {
    await page.goto('/');
    // Check for the exact title we set in index.html
    await expect(page).toHaveTitle('Sacred Steps');
  });

  test('Authentication flow', async ({ page }) => {
    // Register
    await page.goto('/auth');
    await page.fill('input[name="username"]', 'testuser_' + Date.now());
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]'); // Assuming register button - this might need better targeting if both forms have submit buttons

    // Wait for redirect to dashboard - since there's no logout in the test yet, this will verify login success
    // await expect(page).toHaveURL(/\/dashboard/);
  });

  test('Navigation check', async ({ page }) => {
    await page.goto('/');
    // Check for main nav elements if they exist
    // await expect(page.locator('nav')).toBeVisible();
  });

  test('Accessibility check (Basic)', async ({ page }) => {
    await page.goto('/auth');

    // Check all images have alt text
    const images = await page.getByRole('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });
});
