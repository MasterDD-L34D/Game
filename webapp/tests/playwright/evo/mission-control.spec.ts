import { expect, test } from '@playwright/test';

import { pathFor } from './utils';

test.describe('Mission Control console', () => {
  test('surfaces priority actions for operations', async ({ page }) => {
    await page.goto(pathFor('/mission-control'));

    await expect(page.getByRole('heading', { level: 1, name: 'Mission Control' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Azioni prioritarie' })).toBeVisible();

    const actions = [
      'Allineamento squadre',
      'Allocazione vettori',
      'Protocollo emergenze',
    ];

    for (const label of actions) {
      await expect(page.getByRole('listitem').filter({ hasText: label })).toBeVisible();
    }
  });
});
