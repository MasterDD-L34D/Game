import { expect, test } from '@playwright/test';

function buildDataRoot(baseURL: string): string {
  return new URL('/data/derived/test-fixtures/minimal/', baseURL).toString();
}

test.beforeEach(async ({ context, page, baseURL }) => {
  await context.clearCookies();
  await context.clearPermissions();
  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') {
      console.log(`[console:${type}] ${message.text()}`);
    }
  });
  await page.addInitScript(() => {
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  });
  if (!baseURL) {
    throw new Error('BaseURL non configurato per i test Playwright.');
  }
});

test('dashboard carica il dataset minimo senza errori', async ({ page, baseURL }) => {
  if (!baseURL) throw new Error('BaseURL mancante');
  const dataRoot = buildDataRoot(baseURL);
  await page.goto(`/docs/test-interface/index.html?data-root=${encodeURIComponent(dataRoot)}`);

  await expect(page.locator('[data-metric="forms"]')).toHaveText('1', { timeout: 15000 });
  await expect(page.locator('[data-metric="random"]')).toHaveText('2', { timeout: 15000 });
  await expect(page.locator('[data-metric="biomes"]')).toHaveText('1', { timeout: 15000 });
  await expect(page.locator('[data-metric="species-slots"]')).toHaveText('1', { timeout: 15000 });
  await expect(page.locator('[data-metric="species-synergies"]')).toHaveText('1', {
    timeout: 15000,
  });

  const timestamp = page.locator('#last-updated');
  await expect(timestamp).toContainText('Ultimo aggiornamento');
  await expect(timestamp).not.toContainText('Errore');
  await expect(timestamp).not.toContainText('fallback', { timeout: 15000 });

  const dataSource = page.locator('#data-source');
  await expect(dataSource).toContainText(dataRoot);
});

test('workspace manuale mette in coda il payload da packs.yaml', async ({ page, baseURL }) => {
  if (!baseURL) throw new Error('BaseURL mancante');
  const dataRoot = buildDataRoot(baseURL);
  await page.goto(
    `/docs/test-interface/manual-fetch.html?data-root=${encodeURIComponent(dataRoot)}`,
  );

  const status = page.locator('#fetch-status');
  await expect(status).toContainText('In attesa');

  await page.fill('#fetch-url', `${dataRoot}data/packs.yaml`);
  await page.getByRole('button', { name: 'Elabora sorgente' }).click();

  await expect(status).toHaveAttribute('data-status', 'success');
  await expect(status).toContainText('Sync programmata');

  const summary = page.locator('#fetch-preview-summary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('YAML');

  const pending = page.locator('#manual-pending-summary');
  await expect(pending).toContainText('packs');

  const storedPayload = await page.evaluate(() =>
    window.localStorage.getItem('et-manual-sync-payload'),
  );
  expect(storedPayload).not.toBeNull();
  const parsed = storedPayload ? JSON.parse(storedPayload) : null;
  expect(parsed && typeof parsed.data === 'object').toBeTruthy();
  expect(parsed?.detectedKey || parsed?.targetDataset || parsed?.data?.detectedKey).toBe('packs');
});
