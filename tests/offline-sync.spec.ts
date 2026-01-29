import { test, expect } from '@playwright/test';
import { nanoid } from 'nanoid';

test.describe('Offline Mission Capability', () => {
  const username = `ghost_${nanoid(4)}`;
  const password = 'securepassword123';

  test('User can check-in offline and sync when online', async ({ page, context }) => {
    // Grant geolocation permissions and set location
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 12.2353, longitude: 79.0847 });

    // 1. Infiltration (Registration)
    await page.goto('/auth');
    await page.getByRole('tab', { name: 'Register' }).click();
    const registerForm = page.locator('div[role="tabpanel"][data-state="active"] form');
    await registerForm.locator('input[name="username"]').fill(username);
    await registerForm.locator('input[name="password"]').fill(password);
    await registerForm.locator('button[type="submit"]').click();

    await page.waitForURL('/dashboard');

    // Ensure Shrines are loaded before going offline
    const checkInButton = page.getByRole('button', { name: 'Check In' }).first();
    await expect(checkInButton).toBeVisible();

    // 2. Go Dark (Offline)
    await context.setOffline(true);

    // Force onLine to false to ensure app logic sees it consistently
    await page.evaluate(() => {
        Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true });
        window.dispatchEvent(new Event('offline'));
    });

    // Check for offline indicator (may take a moment to appear)
    await expect(page.getByRole('alert')).toContainText('You are currently offline');

    // 3. Execute Mission (Check-in)
    // Use specific label to avoid ambiguity
    const indraButton = page.getByLabel('Check in to Indra Lingam');
    await indraButton.click();

    // It should change state. Since we are offline, Geolocation might timeout (5s) or fail immediately.
    // Eventually, it should proceed to check-in (optimistic update).
    // The "Check In" button should disappear (replaced by "Visited" button which has different text/label).
    await expect(indraButton).not.toBeVisible({ timeout: 15000 });

    // 4. Verify Local State
    // Verify Journal is visible
    await expect(page.getByText('Your Journal')).toBeVisible();

    // Verify a card appeared (check for textarea)
    await expect(page.locator('textarea')).toBeVisible();

    // Should see "Syncing..." in the journal button (implies visit.id is -1)
    // Use locator with text content to be safer
    await expect(page.locator('button:has-text("Syncing...")')).toBeVisible({ timeout: 10000 });

    // Take screenshot for verification
    await page.screenshot({ path: 'verification/offline-checkin.png' });

    // 5. Re-establish Comms (Online)
    await context.setOffline(false);
    await page.evaluate(() => {
        Object.defineProperty(navigator, 'onLine', { get: () => true, configurable: true });
        window.dispatchEvent(new Event('online'));
    });

    // Reload to verify persistence and ensure SyncManager picks it up
    await page.reload();

    // 6. Verify Sync
    // The "Syncing..." button should become "Save" (id becomes valid)
    // Wait for the sync to happen (SyncManager processing)
    await expect(page.getByText('Save')).toBeVisible({ timeout: 15000 });

    // Verify Card style (no longer dashed/opacity)
    // The card with "Your Reflection" should not have opacity class
    // We can't easily check class absence on a generic locator, but we can check if "Syncing..." is gone.
    await expect(page.getByRole('button', { name: 'Syncing...' })).not.toBeVisible();
  });
});
