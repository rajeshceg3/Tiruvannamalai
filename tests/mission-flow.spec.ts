import { test, expect } from '@playwright/test';
import { nanoid } from 'nanoid';

test.describe('Tactical Mission Flow', () => {
  const username = `seal_${nanoid(4)}`;
  const password = 'securepassword123';

  test('User can register, login, execute mission (check-in), and view report', async ({ page, context }) => {
    // Grant geolocation to ensure deterministic behavior
    // We simulate being at "Indra Lingam" (12.2353, 79.0847) to verify PHYSICAL check-in logic
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 12.2353, longitude: 79.0847 });

    // 1. Infiltration (Registration)
    await page.goto('/auth');
    const registerTab = page.getByRole('tab', { name: 'Register' });
    await registerTab.click();

    const registerForm = page.locator('div[role="tabpanel"][data-state="active"] form');
    await registerForm.locator('input[name="username"]').fill(username);
    await registerForm.locator('input[name="password"]').fill(password);
    await registerForm.locator('button[type="submit"]').click();

    // 2. Dashboard Recon (Verification)
    await page.waitForURL('/dashboard', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText(`Namaste, ${username}`)).toBeVisible();

    // 3. Mission Execution (Check-in)
    // Locate the first Shrine Card that hasn't been visited
    const checkInButton = page.getByRole('button', { name: 'Check In' }).first();
    await expect(checkInButton).toBeVisible();

    // Execute Check-in
    await checkInButton.click();

    // 4. Verify Outcome (Physical Location Verified)
    // Since we are at the exact coordinates of Indra Lingam, we expect a verified check-in.

    // Expect the toast to say "Location Verified!"
    // Using exact: true to avoid matching the screen reader notification which might duplicate the text
    await expect(page.getByText('Location Verified!', { exact: true })).toBeVisible({ timeout: 10000 });

    // Wait for the button state to change to "Visited"
    await expect(page.getByRole('button', { name: 'Visited' }).first()).toBeVisible({ timeout: 10000 });

    // 5. Journal Verification
    // Check if the Visit Card appears in the Journal column
    // We look for "Your Reflection" which appears in the VisitCard
    await expect(page.getByText('Your Reflection:')).toBeVisible();

    // 6. Situational Awareness (Connection Status)
    await expect(page.locator('.bg-green-500')).toBeVisible({ timeout: 15000 });
  });
});
