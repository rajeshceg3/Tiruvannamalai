import { test, expect } from '@playwright/test';
import { nanoid } from 'nanoid';

test.describe('Tactical Mission Flow', () => {
  const username = `seal_${nanoid(4)}`;
  const password = 'securepassword123';

  test('User can register, login, and view dashboard', async ({ page }) => {
    // 1. Infiltration (Registration)
    await page.goto('/auth');

    // Switch to Register tab
    const registerTab = page.getByRole('tab', { name: 'Register' });
    await registerTab.click();

    // Fill Registration Form
    const registerForm = page.locator('div[role="tabpanel"][data-state="active"] form');
    await registerForm.locator('input[name="username"]').fill(username);
    await registerForm.locator('input[name="password"]').fill(password);

    await registerForm.locator('button[type="submit"]').click();

    // 2. Dashboard Recon (Verification)
    // Wait for navigation to dashboard - timeout increased for initial load
    await page.waitForURL('/dashboard', { timeout: 15000 });

    // Verify Dashboard Landing using more specific locator
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText(`Namaste, ${username}`)).toBeVisible();

    // Verify Journal Section (Use specific heading to avoid "Your journal is empty" ambiguity)
    await expect(page.getByRole('heading', { name: 'Your Journal' })).toBeVisible();

    // 3. Situational Awareness (Connection Status)
    // The sidebar should show the connection status
    await expect(page.locator('.bg-green-500')).toBeVisible({ timeout: 15000 });
  });
});
