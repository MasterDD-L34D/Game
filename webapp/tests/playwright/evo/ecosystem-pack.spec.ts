import { expect, test } from '@playwright/test';

import { pathFor } from './utils';

test.describe('Ecosystem Pack console', () => {
  test('lists modular packages with summaries', async ({ page }) => {
    await page.goto(pathFor('/ecosystem-pack'));

    await expect(page.getByRole('heading', { level: 1, name: 'Ecosystem Pack' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Pacchetti disponibili' })).toBeVisible();

    const packages = [
      'Pack Strategico',
      'Pack Biomi',
      'Pack Supporto AI',
    ];

    for (const label of packages) {
      await expect(page.getByRole('listitem').filter({ hasText: label })).toBeVisible();
    }
  });
});
