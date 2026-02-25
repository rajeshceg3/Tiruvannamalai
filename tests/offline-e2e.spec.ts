import { test, expect } from '@playwright/test';
import { nanoid } from 'nanoid';

test.describe('Offline UX Transitions', () => {
  const username = `operator_${nanoid(4)}`;
  const password = 'securepassword123';

  test.beforeEach(async ({ page }) => {
    // 1. Setup User
    await page.goto('/auth');
    await page.getByRole('tab', { name: 'Register' }).click();
    const registerForm = page.locator('div[role="tabpanel"][data-state="active"] form');
    await registerForm.locator('input[name="username"]').fill(username);
    await registerForm.locator('input[name="password"]').fill(password);
    await registerForm.locator('button[type="submit"]').click();
    await page.waitForURL('/dashboard');
  });

  test('UI reacts dynamically to network connectivity changes', async ({ page, context }) => {
    // 1. Initial State: Online
    // The indicator should NOT be "Connection lost".
    // It might be hidden or showing "Connected" depending on implementation details,
    // but definitely not "Connection lost".
    await expect(page.getByText('Connection lost')).not.toBeVisible();

    // 2. Go Dark (Simulate Offline)
    await context.setOffline(true);

    // 3. Verify Offline Indicator
    // The 'OfflineIndicator' component listens to 'offline' event and should show the alert.
    // When navigator.onLine is false, the text is "You are currently offline".
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('You are currently offline')).toBeVisible();

    // 4. Restore Link (Simulate Online)
    await context.setOffline(false);

    // 5. Verify Recovery
    // The component should switch state.
    // Based on code: it shows a toast "Connection Restored" and then likely hides the red alert
    // or switches to green "Syncing..." if there are items, or hides if empty.
    // Since queue is empty, it should eventually hide.

    // Check for the Toast
    await expect(page.getByText('Connection Restored', { exact: true })).toBeVisible({ timeout: 10000 });

    // Check that offline text is gone
    await expect(page.getByText('You are currently offline')).not.toBeVisible();
  });
});
