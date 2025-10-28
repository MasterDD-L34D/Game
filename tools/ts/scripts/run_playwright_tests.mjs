#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureChromiumExecutable } from './ensure_chromium.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

async function main() {
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

  const playwrightBin = path.join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright');
  const child = spawn(playwrightBin, ['test', ...args], {
    cwd: projectRoot,
    stdio: 'inherit',
    env
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
