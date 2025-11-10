import { test, expect } from '@playwright/test';

test('navigazione principale', async ({ page }) => {
  await page.goto('/');
  // Link chiave in header/nav
  const links = ['Generatore','Bestiario','Biomi','Regole'];
  for (const label of links) {
    const el = page.getByRole('link', { name: label });
    await expect(el).toBeVisible();
  }
});
