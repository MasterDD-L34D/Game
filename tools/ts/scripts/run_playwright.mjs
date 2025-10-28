import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();
const cacheDir = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(cwd, "node_modules", ".cache", "ms-playwright");

async function hasChromiumBrowser(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.some((entry) => entry.isDirectory() && entry.name.startsWith("chromium"));
  } catch (error) {
    if ((error && typeof error === "object" && "code" in error && error.code === "ENOENT") || error?.code === "ENOTDIR") {
      return false;
    }
    throw error;
  }
}

if (process.env.SKIP_PLAYWRIGHT_TESTS === "1") {
  console.log("SKIP_PLAYWRIGHT_TESTS=1 rilevato: salto i test UI Playwright.");
  process.exit(0);
}

if (!(await hasChromiumBrowser(cacheDir))) {
  console.warn(
    "Chromium non trovato nella cache Playwright. Salto i test UI.\n" +
      "Esegui 'npm run playwright:install' su una macchina con accesso a Internet per abilitare questi test."
  );
  process.exit(0);
}

await new Promise((resolve, reject) => {
  const child = spawn("npx", ["playwright", "test"], {
    stdio: "inherit",
    env: process.env,
    cwd,
  });
  child.on("exit", (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(new Error(`Playwright test runner exited with status ${code}`));
    }
  });
  child.on("error", (error) => {
    reject(error);
  });
});
