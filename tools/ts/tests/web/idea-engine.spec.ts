import { expect, test, Page } from '@playwright/test';

declare global {
  interface Window {
    IdeaWidget?: {
      mount: (selector: string, config: unknown) => Promise<unknown>;
      DEFAULT_CATEGORIES: string[];
    };
    IDEA_WIDGET_CONFIG: Record<string, unknown>;
  }
}

async function ensureIdeaWidgetMounted(page: Page) {
  await page.waitForFunction(
    () => typeof window !== 'undefined' && typeof window.IdeaWidget?.mount === 'function',
    null,
    { timeout: 30000 },
  );

  await page.evaluate(async () => {
    if (window.IdeaWidget?.mount) {
      const hasForm = document.querySelector('#idea-widget form');
      if (!hasForm) {
        await window.IdeaWidget.mount('#idea-widget', window.IDEA_WIDGET_CONFIG);
      }
    }
  });

  await page.waitForSelector('#idea-widget form', { timeout: 20000 });
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

  await page.route('**/*.ts', async (route) => {
    const response = await route.fetch();
    const headers = {
      ...response.headers(),
      'content-type': 'text/javascript',
    };
    const body = await response.text();
    await route.fulfill({
      status: response.status(),
      body,
      headers,
    });
  });
});

test('permette export markdown offline', async ({ page }) => {
  await page.goto('/docs/ideas/index.html');

  await ensureIdeaWidgetMounted(page);

  await page.waitForSelector('#idea-widget #title', { timeout: 20000 });

  await page.fill('#title', 'Idea offline Playwright');
  await page.fill('#summary', 'Verifica del flusso di export in modalità offline.');
  await page.fill('#tags', '#playwright #offline');
  await page.fill('#biomes_input', 'dorsale_termale_tropicale');
  await page.press('#biomes_input', 'Enter');
  await page.fill('#ecosystems_input', 'meta_ecosistema_alpha');
  await page.press('#ecosystems_input', 'Enter');
  await page.fill('#species_input', 'dune-stalker');
  await page.press('#species_input', 'Enter');
  await page.fill('#traits_input', 'focus_frazionato');
  await page.press('#traits_input', 'Enter');
  await page.fill('#game_functions_input', 'telemetria_vc');
  await page.press('#game_functions_input', 'Enter');
  await page.fill('#actions_next', '- [ ] valida export\n- [ ] sincronizza reminder');

  await page.getByRole('button', { name: 'Anteprima / Export .md' }).click();

  const preview = page.locator('#result pre.preview');
  await expect(preview).toContainText('IDEA: Idea offline Playwright');
  await expect(preview).toContainText('## Suggested Next Actions');
  await expect(preview).toContainText('- **Biomi:** dorsale_termale_tropicale');

  const reminder = page.locator('#result pre.preview');
  await expect(reminder).toContainText('TAGS: #playwright #offline');
  await expect(reminder).toContainText('BIOMI: dorsale_termale_tropicale');
  await expect(reminder).toContainText('ECOSISTEMI: meta_ecosistema_alpha');

  const note = page.locator('#result .note.small');
  await expect(note).toContainText('Metti il file in  /ideas');
});

test('invia idea al backend configurato', async ({ page }) => {
  const requests: Array<{
    body: Record<string, unknown> | null;
    headers: Record<string, string>;
  }> = [];

  await page.route('**/api/ideas', async (route) => {
    const request = route.request();
    requests.push({
      body: request.postDataJSON() as Record<string, unknown> | null,
      headers: request.headers(),
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        exportPr: { pr_url: 'https://github.com/example/repo/pull/42' },
        ghIssue: { html_url: 'https://github.com/example/repo/issues/99' },
        driveDoc: { url: 'https://drive.example/doc/alpha' },
      }),
    });
  });

  await page.goto('/docs/ideas/index.html?apiBase=https://api.example.test&apiToken=test-token');

  await ensureIdeaWidgetMounted(page);

  await page.waitForSelector('#idea-widget #title', { timeout: 20000 });

  await page.fill('#title', 'Idea backend Playwright');
  await page.fill('#summary', 'Simulazione invio con backend configurato.');
  await page.fill('#github', 'MasterDD-L34D/Game');

  await page.getByRole('button', { name: 'Invia al backend' }).click();

  const ok = page.locator('#result .ok');
  await expect(ok).toHaveText('✅ Idea registrata.');

  const links = page.locator('#result a.linkish');
  await expect.poll(() => links.count()).toBeGreaterThanOrEqual(3);
  await expect(
    page.locator('#result a.linkish[href="https://github.com/example/repo/pull/42"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('#result a.linkish[href="https://github.com/example/repo/issues/99"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('#result a.linkish[href="https://drive.example/doc/alpha"]'),
  ).toHaveCount(1);

  expect(requests).toHaveLength(1);
  const payload = (requests[0]?.body ?? {}) as Record<string, unknown>;
  expect(payload && typeof payload === 'object').toBeTruthy();
  expect(payload).toMatchObject({
    title: 'Idea backend Playwright',
    summary: 'Simulazione invio con backend configurato.',
  });

  const authHeader = requests[0]?.headers?.['authorization'];
  expect(authHeader).toBe('Bearer test-token');
});
