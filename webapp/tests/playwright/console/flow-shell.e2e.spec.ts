import { expect, test } from '@playwright/test';

const FLOW_STEPS = [
  'Overview',
  'Specie',
  'Setup Biomi',
  'Biomi',
  'Encounter',
  'Quality & Release',
  'Publishing',
];

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

test("flow shell mostra indicatori EvoGene Deck, badge QA e log lungo l'intero percorso", async ({
  page,
}) => {
  await page.goto('/docs/mission-console/index.html');

  const shell = page.locator('.evogene-deck-shell');
  await expect(shell).toBeVisible({ timeout: 20_000 });

  const indicatorLights = shell.locator('.evogene-deck-shell__lights .evogene-deck-light');
  await expect(indicatorLights).toHaveCount(3);
  await expect(indicatorLights.nth(0)).toHaveAttribute('aria-label', /Snapshot/i);
  await expect(indicatorLights.nth(1)).toHaveAttribute('aria-label', /Specie/i);
  await expect(indicatorLights.nth(2)).toHaveAttribute('aria-label', /Trait diagnostics/i);

  const stepIndicator = page.locator('.evogene-deck-step-indicator');
  const activeBreadcrumb = page.locator('.flow-breadcrumb__link--active .flow-breadcrumb__label');
  const nextButton = page.getByRole('button', { name: 'Avanti →' });

  for (let index = 0; index < FLOW_STEPS.length; index += 1) {
    const expectedStep = FLOW_STEPS[index];
    await expect(activeBreadcrumb).toHaveText(expectedStep, { timeout: 10_000 });
    await expect(stepIndicator).toHaveText(
      new RegExp(`^${index + 1}\\s*/\\s*${FLOW_STEPS.length}`),
    );
    if (index < FLOW_STEPS.length - 1) {
      await nextButton.click();
    }
  }
  await expect(nextButton).toBeDisabled();

  const qaBadges = page.locator('.flow-telemetry__badges .evogene-deck-telemetry');
  await expect(qaBadges).toHaveCount(3);
  await expect(qaBadges.nth(0)).toHaveAttribute('role', 'group');
  await expect(qaBadges.nth(0).locator('.evogene-deck-telemetry__label')).toHaveText(
    'Validator warnings',
  );
  await expect(qaBadges.nth(0).locator('.evogene-deck-telemetry__value')).toHaveText('1');
  await expect(qaBadges.nth(1).locator('.evogene-deck-telemetry__label')).toHaveText(
    'Fallback attivi',
  );
  await expect(qaBadges.nth(1).locator('.evogene-deck-telemetry__value')).toHaveText('1');
  await expect(qaBadges.nth(2).locator('.evogene-deck-telemetry__label')).toHaveText('Request ID');
  await expect(qaBadges.nth(2).locator('.evogene-deck-telemetry__value')).toContainText(
    'nebula-priority',
  );

  const telemetryLogs = page.locator('.flow-telemetry__log');
  await expect(telemetryLogs.first()).toBeVisible();
  await expect(page.locator('.flow-telemetry__logs')).toContainText('Batch QA-NEB completato');
  await expect(page.locator('.flow-telemetry__logs')).toContainText('Hazard non impostato');
});
