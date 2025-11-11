import { test, expect } from '@playwright/test';

test('generatore — apertura e parametri di base', async ({ page }) => {
  await page.goto('/generatore');
  // controlla presenza di elementi base (placeholders generici)
  await expect(page).toHaveTitle(/Generatore/i);
  // Se esistono controlli via querystring, prova a valorizzarli
  await page.goto('/generatore?bioma=desert&ruolo=harvester&rank=r2');
  await expect(page).toHaveURL(/bioma=desert/);
});
