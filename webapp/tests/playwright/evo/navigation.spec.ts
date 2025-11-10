import { expect, test } from '@playwright/test';

test.describe('Evo-Tactics navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('off-canvas menu toggles and highlights the active route', async ({ page }) => {
    const menuToggle = page.getByRole('button', { name: 'Apri il menù Evo-Tactics Console' });
    const overlay = page.locator('.app-shell__overlay');
    const navigation = page.locator('#mission-console-navigation');

    await expect(navigation).not.toHaveClass(/navigation--open/);
    await expect(overlay).not.toHaveClass(/app-shell__overlay--visible/);

    await menuToggle.click();

    await expect(navigation).toHaveClass(/navigation--open/);
    await expect(overlay).toHaveClass(/app-shell__overlay--visible/);

    const missionConsoleLink = navigation.getByRole('menuitem', { name: 'Mission Console' });
    await expect(missionConsoleLink).toBeVisible();

    await missionConsoleLink.click();

    await expect(page).toHaveURL(/\/mission-console$/);
    await expect(navigation).not.toHaveClass(/navigation--open/);

    const activeTopbar = navigation.locator('.navigation__topbar-item--active .navigation__topbar-text');
    await expect(activeTopbar).toHaveText('Mission Console');
  });

  test('primary navigation exposes Evo console destinations', async ({ page }) => {
    await page.getByRole('button', { name: 'Apri il menù Evo-Tactics Console' }).click();

    const expectedLabels = [
      'Generatore',
      'Mission Control',
      'Mission Console',
      'Ecosystem Pack',
      'Dashboard',
      'Atlas',
      'Traits',
      'Nebula',
    ];

    for (const label of expectedLabels) {
      await expect(page.getByRole('button', { name: label }).first()).toBeVisible();
    }
  });
});
