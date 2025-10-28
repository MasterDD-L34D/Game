#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoTsDir = path.resolve(currentDir, "..");

const browsersDir = path.join(repoTsDir, "node_modules", "playwright-core", ".local-browsers");
const needSudo = typeof process.getuid === "function" && process.getuid() !== 0;

const run = (command, args, options = {}) =>
  spawnSync(command, args, { stdio: "inherit", ...options });

const runElevated = (command, args, options = {}) => {
  if (!needSudo) {
    return run(command, args, options);
  }
  return run("sudo", [command, ...args], options);
};

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

const chromeUrl =
  process.env.PLAYWRIGHT_CHROME_FALLBACK_URL ??
  "https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb";

console.error(
  "Playwright non ha potuto scaricare Chromium (codice %s). Avvio fallback con Google Chrome...",
  installResult.status ?? "sconosciuto",
);

const tempDir = mkdtempSync(path.join(tmpdir(), "chrome-"));
const chromePkg = path.join(tempDir, "google-chrome-stable.deb");

const curlResult = run("curl", ["--fail", "--location", "--output", chromePkg, chromeUrl]);
if (curlResult.status !== 0) {
  console.error("Download di Google Chrome fallito. Impostare PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH manualmente.");
  rmSync(tempDir, { recursive: true, force: true });
  process.exit(curlResult.status ?? 1);
}

const aptCommonFlags = [
  "-o",
  "Acquire::Retries=3",
  "-o",
  "Acquire::http::Timeout=15",
];

const aptUpdateResult = runElevated("timeout", [
  "60",
  "apt-get",
  ...aptCommonFlags,
  "update",
]);
if (aptUpdateResult.status !== 0) {
  console.warn(
    "apt-get update non riuscito (codice %s). Continuo con l'installazione del pacchetto.",
    aptUpdateResult.status ?? "sconosciuto",
  );
}

const dpkgResult = runElevated("dpkg", ["-i", chromePkg]);
if (dpkgResult.status !== 0) {
  console.warn(
    "dpkg -i ha restituito %s. Provo a risolvere le dipendenze mancanti con apt-get -f install.",
    dpkgResult.status ?? "sconosciuto",
  );
  runElevated("apt-get", [
    ...aptCommonFlags,
    "install",
    "--yes",
    "--no-install-recommends",
    "-f",
  ]);
}

rmSync(tempDir, { recursive: true, force: true });

if (hasExecutableCandidate()) {
  console.log("Browser fallback installato con successo.");
  process.exit(0);
}

console.error("Impossibile predisporre un browser Playwright funzionante.");
process.exit(dpkgResult.status ?? installResult.status ?? 1);
