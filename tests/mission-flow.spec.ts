import { test, expect } from '@playwright/test';
import { nanoid } from 'nanoid';

test.describe('Tactical Mission Flow', () => {
  const username = `seal_${nanoid(4)}`;
  const password = 'securepassword123';

  test('User can register, login, execute mission (check-in), and view report', async ({ page, context }) => {
    // Grant geolocation to ensure deterministic behavior (even if we simulate being far away)
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 0, longitude: 0 }); // Null Island

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

    // 4. Verify Outcome (Virtual Check-in fallback or Location Verified depending on mock)
    // Since we are at 0,0 and shrines are likely elsewhere, it might be a "Virtual" check-in or "Location access denied" toast if strictly mocked.
    // However, the code falls back to virtual check-in on error/mismatch.

    // Wait for the button state to change to "Visited"
    // This confirms the optimistic update or server response handled the state change.
    await expect(page.getByRole('button', { name: 'Visited' }).first()).toBeVisible({ timeout: 10000 });

    // 5. Journal Verification
    // Check if the Visit Card appears in the Journal column
    // We look for "Your Reflection" which appears in the VisitCard
    await expect(page.getByText('Your Reflection:')).toBeVisible();

    // 6. Situational Awareness (Connection Status)
    await expect(page.locator('.bg-green-500')).toBeVisible({ timeout: 15000 });
  });
});
