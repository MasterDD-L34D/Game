import { expect, test } from '@playwright/test';

test.describe('Mission dashboard', () => {
  test('renders mission summary, metrics, and event log entries', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Mission Console' })).toBeVisible();

    const summaryItems = page.locator('.status-summary__item');
    await expect(summaryItems.filter({ hasText: 'In corso' }).locator('dd')).toHaveText('1');
    await expect(summaryItems.filter({ hasText: 'Pianificate' }).locator('dd')).toHaveText('1');
    await expect(summaryItems.filter({ hasText: 'Rischio' }).locator('dd')).toHaveText('1');
    await expect(summaryItems.filter({ hasText: 'Completate' }).locator('dd')).toHaveText('1');

    await expect(page.getByText('Mission Readiness')).toBeVisible();
    await expect(page.getByText('Operation Orion Outpost')).toBeVisible();
    await expect(page.getByText('Project Tidal', { exact: false })).toBeVisible();
  });
});
