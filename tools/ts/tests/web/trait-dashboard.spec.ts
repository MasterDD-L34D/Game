import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const toolingDir = path.join(repoRoot, "logs", "tooling");
const logPath = path.join(toolingDir, "trait-plan-dashboard.log");

function buildDataRoot(baseURL: string): string {
  return new URL("/data/mock/prod_snapshot/", baseURL).toString();
}

test.beforeEach(async ({ context, page, baseURL }) => {
  await context.clearCookies();
  await context.clearPermissions();
  page.on("console", (message) => {
    const type = message.type();
    if (type === "error" || type === "warning") {
      console.log(`[console:${type}] ${message.text()}`);
    }
  });
  await page.addInitScript(() => {
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  });
  if (!baseURL) {
    throw new Error("BaseURL non configurato per i test Playwright.");
  }
});

test("trait plan mostra i nuovi core/optional", async ({ page, baseURL }, testInfo) => {
  if (!baseURL) throw new Error("BaseURL mancante");
  const dataRoot = buildDataRoot(baseURL);
  await page.goto(`/docs/test-interface/index.html?data-root=${encodeURIComponent(dataRoot)}`);

  const traitPlan = page.locator(".species-trait-plan");
  await expect(traitPlan).toBeVisible({ timeout: 20_000 });

  const coreTrait = page.locator('.species-trait-plan .pill[data-trait-id="sensori_geomagnetici"]');
  await expect(coreTrait).toBeVisible();
  await expect(coreTrait).toHaveAttribute("data-variant", "core");
  await expect(coreTrait).toHaveText(/Sensori Geomagnetici/i);

  const optionalTrait = page.locator('.species-trait-plan .pill[data-trait-id="lamelle_termoforetiche"]');
  await expect(optionalTrait).toBeVisible();
  await expect(optionalTrait).toHaveAttribute("data-variant", "optional");
  await expect(optionalTrait).toHaveText(/Lamelle Termoforetiche/i);

  await mkdir(toolingDir, { recursive: true });
  const traitPlanSection = page.locator(".species-trait-plan");
  const screenshotBuffer = await traitPlanSection.screenshot();
  await testInfo.attach("trait-plan-dashboard", {
    body: screenshotBuffer,
    contentType: "image/png",
  });

  const cards = traitPlanSection.locator(".species-trait-card");
  const cardCount = await cards.count();
  const sourceDisplay = (() => {
    try {
      const parsed = new URL(dataRoot);
      return parsed.pathname.replace(/^\//, "") || dataRoot;
    } catch (error) {
      return dataRoot;
    }
  })();

  const logLines: string[] = [
    "# Trait plan snapshot",
    `source: ${sourceDisplay}`,
    `cards: ${cardCount}`,
  ];

  for (let cardIndex = 0; cardIndex < cardCount; cardIndex += 1) {
    const card = cards.nth(cardIndex);
    const speciesId = (await card.getAttribute("data-species-id")) ?? "unknown";
    const speciesName = (await card.locator("header h3").innerText()).trim();
    logLines.push("");
    logLines.push(`## ${speciesName} (${speciesId})`);

    const traitGroups: Array<{ label: string; variant: string }> = [
      { label: "Core", variant: "core" },
      { label: "Opzionali", variant: "optional" },
      { label: "Sinergie", variant: "synergy" },
    ];

    for (const group of traitGroups) {
      const groupLocator = card.locator(`.pill-group[data-trait-group="${group.variant}"]`);
      if (await groupLocator.count()) {
        logLines.push(`- ${group.label}`);
        const pills = groupLocator.locator(".pill");
        const pillCount = await pills.count();
        for (let pillIndex = 0; pillIndex < pillCount; pillIndex += 1) {
          const pill = pills.nth(pillIndex);
          const label = (await pill.innerText()).replace(/\s+/g, " ").trim();
          const traitId = (await pill.getAttribute("data-trait-id")) ?? "";
          const variant = (await pill.getAttribute("data-variant")) ?? group.variant;
          logLines.push(`  - ${label} [${traitId}] (${variant})`);
        }
      }
    }
  }

  const logContent = `${logLines.join("\n")}\n`;
  await writeFile(logPath, logContent, "utf-8");
  await testInfo.attach("trait-plan-dashboard-log", {
    body: logContent,
    contentType: "text/plain",
  });
});
