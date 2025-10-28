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

function runInstall(args) {
  return new Promise((resolve) => {
    const child = spawn("npx", ["playwright", ...args], {
      stdio: "inherit",
      env: process.env,
      cwd,
    });
    child.on("exit", (code, signal) => {
      resolve({ code, signal });
    });
    child.on("error", (error) => {
      console.warn("Impossibile eseguire l'installer Playwright:", error.message);
      resolve({ code: 1, signal: null });
    });
  });
}

const hasChromium = await hasChromiumBrowser(cacheDir);
if (hasChromium) {
  process.exit(0);
}

console.log("Chromium non presente nella cache Playwright. Avvio installazione...");
const { code } = await runInstall(["install", "chromium"]);

if (code === 0 && (await hasChromiumBrowser(cacheDir))) {
  process.exit(0);
}

console.warn(
  "Installazione Chromium fallita o browser non disponibile. I test Playwright verranno ignorati.\n" +
    "Esegui 'npm run playwright:install' su una macchina con accesso a Internet per ripristinare i test web."
);
process.exit(0);
