#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { access, readdir } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

async function pathExists(candidate) {
  if (!candidate) return false;
  try {
    await access(candidate, fsConstants.X_OK);
    return true;
  } catch (error) {
    try {
      await access(candidate, fsConstants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

async function findPlaywrightExecutable() {
  const caches = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(projectRoot, 'node_modules', '.cache', 'ms-playwright'),
    path.join(projectRoot, 'node_modules', 'playwright-core', '.local-browsers')
  ].filter(Boolean);

  for (const base of caches) {
    try {
      const entries = await readdir(base, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (!entry.name.startsWith('chromium')) continue;
        const chromiumCandidates = [
          path.join(base, entry.name, 'chrome-linux', 'chrome'),
          path.join(base, entry.name, 'chrome-linux64', 'chrome'),
          path.join(base, entry.name, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
          path.join(base, entry.name, 'chrome-mac-arm64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
          path.join(base, entry.name, 'chrome-win', 'chrome.exe'),
          path.join(base, entry.name, 'chrome-win64', 'chrome.exe')
        ];
        for (const candidate of chromiumCandidates) {
          if (await pathExists(candidate)) {
            return candidate;
          }
        }
      }
    } catch (error) {
      // ignore missing cache directories
    }
  }
  return null;
}

async function findPuppeteerExecutable() {
  const homeDir = process.env.HOME;
  if (!homeDir) return null;
  const puppeteerCache = path.join(homeDir, '.cache', 'puppeteer');
  try {
    const products = await readdir(puppeteerCache, { withFileTypes: true });
    for (const product of products) {
      if (!product.isDirectory()) continue;
      const productDir = path.join(puppeteerCache, product.name);
      const builds = await readdir(productDir, { withFileTypes: true });
      for (const build of builds) {
        if (!build.isDirectory()) continue;
        const buildDir = path.join(productDir, build.name);
        const chromiumCandidates = [
          path.join(buildDir, 'chrome-linux', 'chrome'),
          path.join(buildDir, 'chrome-linux64', 'chrome'),
          path.join(buildDir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
          path.join(buildDir, 'chrome-mac-arm64', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
          path.join(buildDir, 'chrome-win', 'chrome.exe'),
          path.join(buildDir, 'chrome-win64', 'chrome.exe')
        ];
        for (const candidate of chromiumCandidates) {
          if (await pathExists(candidate)) {
            return candidate;
          }
        }
      }
    }
  } catch (error) {
    // ignore missing cache
  }
  return null;
}

async function findChromiumExecutable() {
  const playwrightExecutable = await findPlaywrightExecutable();
  if (playwrightExecutable) {
    return { executable: playwrightExecutable, source: 'playwright-cache' };
  }
  const puppeteerExecutable = await findPuppeteerExecutable();
  if (puppeteerExecutable) {
    return { executable: puppeteerExecutable, source: 'puppeteer-cache' };
  }
  return { executable: null, source: null };
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: ['inherit', 'pipe', 'inherit'],
    encoding: 'utf-8',
    ...options
  });
  return result;
}

async function installWithPlaywright() {
  const installEnv = { ...process.env };
  if (!installEnv.PLAYWRIGHT_DOWNLOAD_HOST) {
    installEnv.PLAYWRIGHT_DOWNLOAD_HOST = 'https://playwright.azureedge.net';
  }
  const result = run('npx', ['--yes', 'playwright', 'install', 'chromium'], { env: installEnv });
  if (result.status === 0) {
    return { success: true, output: result.stdout ?? '' };
  }
  return { success: false, output: result.stdout ?? '' };
}

async function installWithPuppeteer() {
  const result = run('npx', ['--yes', 'puppeteer', 'browsers', 'install', 'chrome']);
  if (result.status !== 0) {
    return { success: false, output: result.stdout ?? '' };
  }
  const stdout = (result.stdout ?? '').trim();
  let executable = null;
  if (stdout) {
    const lines = stdout.split(/\r?\n/).filter(Boolean);
    const lastLine = lines.at(-1);
    if (lastLine) {
      const parts = lastLine.trim().split(/\s+/);
      executable = parts.at(-1) ?? null;
    }
  }
  if (executable && !(await pathExists(executable))) {
    executable = null;
  }
  return { success: true, executable, output: stdout };
}

export async function ensureChromiumExecutable({ quiet = false } = {}) {
  let { executable } = await findChromiumExecutable();
  if (executable) {
    if (!quiet) {
      console.log(`[ensure-chromium] Found existing Chromium executable at ${executable}`);
    }
    return executable;
  }

  if (!quiet) {
    console.log('[ensure-chromium] Attempting Playwright-managed browser install...');
  }
  const playwrightInstall = await installWithPlaywright();
  if (playwrightInstall.success) {
    ({ executable } = await findChromiumExecutable());
    if (executable) {
      if (!quiet) {
        console.log(`[ensure-chromium] Playwright installed Chromium at ${executable}`);
      }
      return executable;
    }
  } else if (!quiet) {
    console.warn('[ensure-chromium] Playwright install failed, falling back to Puppeteer');
  }

  if (!quiet) {
    console.log('[ensure-chromium] Installing Chromium via Puppeteer cache...');
  }
  const puppeteerInstall = await installWithPuppeteer();
  if (!puppeteerInstall.success) {
    throw new Error('Failed to install Chromium via Puppeteer fallback.');
  }
  if (!quiet && puppeteerInstall.output) {
    console.log(puppeteerInstall.output.trim());
  }
  if (puppeteerInstall.executable) {
    if (!quiet) {
      console.log(`[ensure-chromium] Puppeteer provided Chromium executable at ${puppeteerInstall.executable}`);
    }
    return puppeteerInstall.executable;
  }
  const puppeteerExecutable = await findPuppeteerExecutable();
  if (puppeteerExecutable) {
    if (!quiet) {
      console.log(`[ensure-chromium] Located Puppeteer Chromium executable at ${puppeteerExecutable}`);
    }
    return puppeteerExecutable;
  }
  throw new Error('Unable to locate Chromium executable after Puppeteer fallback.');
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedDirectly) {
  (async () => {
    try {
      const executable = await ensureChromiumExecutable();
      console.log(executable);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  })();
}
