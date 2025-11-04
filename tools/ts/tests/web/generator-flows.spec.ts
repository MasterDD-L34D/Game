import { expect, test } from '@playwright/test';

test.describe('Evo generator flows', () => {
  test('loads catalog data and performs a roll workflow', async ({ page, baseURL }) => {
    if (!baseURL) {
      throw new Error('Base URL non disponibile per il test Playwright');
    }
    const packRoot = new URL('/packs/evo_tactics_pack/', baseURL).toString();
    await page.goto(
      `/docs/evo-tactics-pack/generator.html?pack-root=${encodeURIComponent(packRoot)}`,
    );

    await page.waitForSelector('#generator-status[data-tone="success"]', { timeout: 20000 });

    const flagButton = await page.waitForSelector('#flags [data-multiselect-option]', {
      timeout: 10000,
    });
    await flagButton.click();
    await expect(page.locator('#generator-filters-hint')).toContainText('Filtri attivi');

    await page.locator('[data-action="roll-ecos"]').click();

    const summary = page.locator('#generator-summary');
    await expect(summary).toHaveAttribute('data-has-results', 'true', { timeout: 20000 });
    await expect(page.locator('[data-summary="biomes"]')).not.toHaveText('0', { timeout: 20000 });
  });
});
