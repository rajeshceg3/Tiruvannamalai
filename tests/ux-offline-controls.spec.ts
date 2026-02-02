import { test, expect } from '@playwright/test';
import { nanoid } from 'nanoid';

test.describe('UX Offline Controls', () => {
  const username = `operator_${nanoid(4)}`;
  const password = 'securepassword123';

  test.beforeEach(async ({ page, context }) => {
    // 1. Setup User and Permissions
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 12.2353, longitude: 79.0847 });

    await page.goto('/auth');
    await page.getByRole('tab', { name: 'Register' }).click();
    const registerForm = page.locator('div[role="tabpanel"][data-state="active"] form');
    await registerForm.locator('input[name="username"]').fill(username);
    await registerForm.locator('input[name="password"]').fill(password);
    await registerForm.locator('button[type="submit"]').click();
    await page.waitForURL('/dashboard');
    await expect(page.getByText('Shrines on the Path')).toBeVisible();
  });

  test('Operator can surgically remove a specific offline item', async ({ page }) => {
    // 2. Inject Queue Item (Simulation of blocked sync)
    await page.evaluate(() => {
        const item = {
             id: 'test-target-alpha',
             type: 'visit',
             payload: { shrineId: '1' },
             createdAt: Date.now()
        };
        localStorage.setItem('offline_mutation_queue', JSON.stringify([item]));
    });

    // 3. Mock Offline State via InitScript (Preserves Network for Reload)
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true });
        // Dispatch offline event just in case
        window.dispatchEvent(new Event('offline'));
    });

    // 4. Reload to initialize OfflineQueue with injected data
    // Network is physically ON, but navigator.onLine is FALSE.
    await page.reload();
    await page.waitForURL('/dashboard');
    await expect(page.getByText('Shrines on the Path')).toBeVisible();

    // Verify Offline Indicator (Should show pending because we have data)
    // OfflineIndicator uses useOnlineStatus which uses navigator.onLine (mocked false).
    const offlineIndicator = page.getByRole('alert').first();
    await expect(offlineIndicator).toBeVisible();

    // 5. Open Command Interface
    await offlineIndicator.click();

    // 6. Verify Item exists
    // 'visit' type maps to 'Shrine Check-in'
    await expect(page.getByText('Shrine Check-in')).toBeVisible();

    // 7. Execute Surgical Removal (Delete)
    const deleteButton = page.getByRole('button', { name: 'Delete Shrine Check-in' });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // 8. Verify Removal
    await expect(page.getByText('Shrine Check-in')).not.toBeVisible();

    // Verify LocalStorage is empty (Double check logic)
    const queueState = await page.evaluate(() => localStorage.getItem('offline_mutation_queue'));
    const parsed = JSON.parse(queueState || '[]');
    expect(parsed.length).toBe(0);
  });
});
