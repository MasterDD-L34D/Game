import { expect, test } from '@playwright/test';

import { pathFor } from './utils';

test.describe('Mission generator', () => {
  test('exposes quick toolkit entries for Evo operators', async ({ page }) => {
    await page.goto(pathFor('/generator'));

    await expect(page.getByRole('heading', { name: 'Generatore Operativo' })).toBeVisible();

    const quickTools = ['Builder sequenziale', 'Profiler missione', 'Calcolo risorse'];

    for (const tool of quickTools) {
      await expect(page.getByText(tool)).toBeVisible();
    }

    await expect(
      page.getByText('Configura missioni con parametri dinamici', { exact: false }),
    ).toBeVisible();
  });
});
