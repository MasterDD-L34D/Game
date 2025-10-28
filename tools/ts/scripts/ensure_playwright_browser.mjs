#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoTsDir = path.resolve(currentDir, "..");

const browsersDir = path.join(repoTsDir, "node_modules", "playwright-core", ".local-browsers");

const executableCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
];

function hasExecutableCandidate() {
  for (const candidate of executableCandidates) {
    if (!candidate) continue;
    const result = spawnSync(candidate, ["--version"], {
      stdio: "ignore",
      shell: true,
    });
    if (result.status === 0) {
      return candidate;
    }
  }
  return null;
}

if (existsSync(browsersDir) || hasExecutableCandidate()) {
  process.exit(0);
}

const downloadHost = process.env.PLAYWRIGHT_DOWNLOAD_HOST ?? "https://playwright.azureedge.net";
const installResult = spawnSync(
  "npx",
  ["playwright", "install", "chromium"],
  {
    stdio: "inherit",
    env: { ...process.env, PLAYWRIGHT_DOWNLOAD_HOST: downloadHost },
  },
);

if (installResult.status === 0) {
  process.exit(0);
}

console.error(
  "Playwright non ha potuto scaricare il browser Chromium (codice %s). Eseguire scripts/install_test_dependencies.sh o impostare PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.",
  installResult.status ?? "sconosciuto",
);
process.exit(installResult.status ?? 1);
