#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureChromiumExecutable } from './ensure_chromium.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(projectRoot, '..', '..');
const consoleTestsDir = path.join(repoRoot, 'webapp', 'tests', 'playwright', 'console');
const require = createRequire(import.meta.url);

async function hasPlaywrightTests() {
  try {
    const entries = await readdir(consoleTestsDir, { withFileTypes: true });
    return entries.some((entry) => {
      if (entry.isDirectory()) return true;
      return /\.((spec|test)\.[cm]?js|[cm]?ts)$/i.test(entry.name);
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function main() {
  if (!(await hasPlaywrightTests())) {
    console.warn(
      `[run-playwright-tests] Nessun test Playwright trovato in ${consoleTestsDir}. Salto test web.`,
    );
    process.exit(0);
  }

  const args = process.argv.slice(2);
  let executable;
  try {
    executable = await ensureChromiumExecutable();
  } catch (error) {
    console.error('[run-playwright-tests] Unable to provision Chromium for Playwright.');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const env = { ...process.env };
  if (executable) {
    env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = executable;
    env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
  }

  let command = process.execPath;
  let commandArgs;

  try {
    const cliEntry = require.resolve('@playwright/test/cli');
    commandArgs = [cliEntry, 'test', ...args];
  } catch (error) {
    const playwrightBin = path.join(
      projectRoot,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'playwright.cmd' : 'playwright',
    );

    command = playwrightBin;
    commandArgs = ['test', ...args];

    if (error instanceof Error) {
      console.warn('[run-playwright-tests] Falling back to Playwright binary:', error.message);
    } else {
      console.warn('[run-playwright-tests] Falling back to Playwright binary.');
    }
  }

  const child = spawn(command, commandArgs, {
    cwd: projectRoot,
    stdio: 'inherit',
    env,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

main();
