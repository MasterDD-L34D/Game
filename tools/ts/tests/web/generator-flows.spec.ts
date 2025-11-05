import { expect, test } from '@playwright/test';
import ts from 'typescript';

const transpileOptions: ts.TranspileOptions = {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    esModuleInterop: true,
    resolveJsonModule: true,
  },
};

test.describe('Evo generator flows', () => {
  test('loads catalog data and performs a roll workflow', async ({ page, baseURL }) => {
    if (!baseURL) {
      throw new Error('Base URL non disponibile per il test Playwright');
    }

    await page.route('**/*.ts', async (route) => {
      const response = await route.fetch();
      const originalBody = await response.text();
      let body = originalBody;

      try {
        const result = ts.transpileModule(originalBody, {
          ...transpileOptions,
          fileName: route.request().url().split('/').pop() ?? 'module.ts',
        });
        body = result.outputText || originalBody;
      } catch (error) {
        console.warn('Impossibile transpile il modulo TypeScript', route.request().url(), error);
      }

      const headers = {
        ...response.headers(),
        'content-type': 'text/javascript',
      };

      await route.fulfill({
        status: response.status(),
        body,
        headers,
      });
    });

    const packRoot = new URL('/packs/evo_tactics_pack/', baseURL).toString();
    await page.goto(
      `/docs/evo-tactics-pack/generator.html?pack-root=${encodeURIComponent(packRoot)}`,
    );

    const status = page.locator('#generator-status');
    await expect(status).toContainText("Catalogo pronto all'uso", { timeout: 45000 });
    await expect(status).toHaveAttribute('data-tone', 'success');

    const flagButton = await page.waitForSelector('#flags [data-multiselect-option]', {
      timeout: 10000,
    });
    await flagButton.click();
    await expect(page.locator('#generator-filters-hint')).toContainText('Filtri attivi');

    await page.locator('[data-action="roll-ecos"]').first().click();

    const summary = page.locator('#generator-summary');
    await expect(summary).toHaveAttribute('data-has-results', 'true', { timeout: 20000 });
    await expect(page.locator('[data-summary="biomes"]')).not.toHaveText('0', { timeout: 20000 });
  });
});
