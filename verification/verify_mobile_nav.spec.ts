
import { test, expect } from '@playwright/test';

test('verify mobile navigation', async ({ page }) => {
  // 1. Go directly to Auth Page
  await page.goto('http://localhost:5000/auth');

  // Directly fill the login form first (default tab)
  const usernameInput = page.locator('input[name="username"]');
  const passwordInput = page.locator('input[name="password"]');

  // Wait for React to hydrate
  await page.waitForTimeout(5000);

  // Check if inputs are visible
  const inputVisible = await usernameInput.first().isVisible();
  if (!inputVisible) {
      console.log('Login input not visible on /auth after 5s. Dumping page content.');
      const content = await page.content();
      console.log(content);
      await page.screenshot({ path: 'verification/debug_auth_fail.png' });
      throw new Error('Login input not visible on /auth');
  }

  // Attempt login with curluser (created via curl)
  await usernameInput.fill('curluser');
  await passwordInput.fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for navigation
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => console.log('Login navigation timeout'));

  if (!page.url().includes('dashboard')) {
      console.log('Login failed or did not redirect. Trying register.');
      // If login failed, try register
      const registerTab = page.getByRole('tab', { name: /Register/i });
      await registerTab.click();
      await page.waitForTimeout(1000);

      const activePanel = page.locator('[role="tabpanel"][data-state="active"]');
      await activePanel.locator('input[name="username"]').fill('verify_user_' + Date.now());
      await activePanel.locator('input[name="password"]').fill('password123');
      await activePanel.getByRole('button', { name: /Register/i }).click();
      await page.waitForURL('**/dashboard', { timeout: 15000 });
  }

  // Wait for dashboard content
  await expect(page.getByRole('heading', { name: 'Dashboard' }).first()).toBeVisible({ timeout: 15000 });

  // 2. Verify Desktop View
  await page.setViewportSize({ width: 1280, height: 720 });

  // Verify Sidebar is visible
  // The sidebar component is a div, not an aside, based on the code.
  // We can look for the navigation links.
  await expect(page.getByRole('link', { name: 'Pathfinder' })).toBeVisible();

  await page.screenshot({ path: 'verification/dashboard_desktop.png' });

  // 3. Verify Mobile View
  await page.setViewportSize({ width: 375, height: 667 });

  // Menu button should be visible - Use accessible name
  const menuButton = page.getByRole('button', { name: 'Toggle menu' });
  await expect(menuButton).toBeVisible();

  // 4. Open Menu
  await menuButton.click();

  // 5. Verify Sidebar Content in Sheet
  // Wait for sheet animation
  await page.waitForTimeout(1000);

  const sheetContent = page.locator('[data-state="open"]');
  // Or just look for a link that should be in the sidebar
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();

  await page.screenshot({ path: 'verification/dashboard_mobile_menu.png' });
});
