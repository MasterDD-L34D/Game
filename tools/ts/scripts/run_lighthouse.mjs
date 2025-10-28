import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { once } from "node:events";

const fsPromises = fs.promises;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const port = Number(process.env.PLAYWRIGHT_WEB_PORT || 4173);
const baseURL = `http://127.0.0.1:${port}/`;
const targetURL = new URL("docs/test-interface/index.html", baseURL);

function findChromeExecutable() {
  const explicit = process.env.CHROME_PATH;
  if (explicit && fs.existsSync(explicit)) {
    return explicit;
  }

  const cacheRoot = path.join(os.homedir(), ".cache", "ms-playwright");
  try {
    const entries = fs.readdirSync(cacheRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith("chromium-")) continue;
      const candidate = path.join(cacheRoot, entry.name, "chrome-linux", "chrome");
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  } catch (error) {
    // Ignore missing cache directories.
  }

  return null;
}

function resolveLighthouseBinary() {
  const binName = process.platform === "win32" ? "lighthouse.cmd" : "lighthouse";
  const candidate = path.resolve(__dirname, "..", "node_modules", ".bin", binName);
  if (!fs.existsSync(candidate)) {
    throw new Error("Binario Lighthouse non trovato. Esegui `npm install` in tools/ts.");
  }
  return candidate;
}

async function runLighthouse(target, outputBase, env) {
  const lighthouseBin = resolveLighthouseBinary();
  const args = [
    target,
    "--output=json",
    "--output=html",
    `--output-path=${outputBase}`,
    "--only-categories=performance,accessibility",
    "--quiet",
    "--enable-error-reporting=false",
    "--chrome-flags=--headless --no-sandbox --disable-gpu --disable-dev-shm-usage",
  ];

  const child = spawn(lighthouseBin, args, {
    stdio: "inherit",
    env,
  });

  const [code] = await once(child, "exit");
  if (code !== 0) {
    throw new Error(`Lighthouse terminato con codice ${code}`);
  }
}

function determineContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".yaml": "text/yaml; charset=utf-8",
    ".yml": "text/yaml; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon",
  };
  return map[extension] || "application/octet-stream";
}

async function handleRequest(root, request, response) {
  const method = request.method || "GET";
  const requestUrl = new URL(request.url || "/", baseURL);
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname.endsWith("/")) {
    pathname += "index.html";
  }

  const startTime = Date.now();
  response.once("finish", () => {
    console.log(`server ${method} ${request.url} -> ${response.statusCode} (${Date.now() - startTime}ms)`);
  });

  const resolvedPath = path.resolve(root, `.${pathname}`);
  if (!resolvedPath.startsWith(root)) {
    response.statusCode = 403;
    response.end("Forbidden");
    return;
  }

  let stat = await fsPromises.stat(resolvedPath).catch(() => null);
  let filePath = resolvedPath;
  if (stat && stat.isDirectory()) {
    filePath = path.join(resolvedPath, "index.html");
    stat = await fsPromises.stat(filePath).catch(() => null);
  }

  if (!stat) {
    console.warn(`server missing ${filePath}`);
    response.statusCode = 404;
    response.end("Not found");
    return;
  }

  response.statusCode = 200;
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Content-Type", determineContentType(filePath));
  if (method === "HEAD") {
    response.end();
    return;
  }

  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.once("error", reject);
    stream.once("end", resolve);
    stream.pipe(response);
  }).catch((error) => {
    console.error("[server]", error);
    if (!response.headersSent) {
      response.statusCode = 500;
    }
    response.end("Server error");
  });
}

async function startStaticServer(root, listenPort) {
  const server = http.createServer((request, response) => {
    handleRequest(root, request, response).catch((error) => {
      console.error("[server]", error);
      if (!response.headersSent) {
        response.statusCode = 500;
      }
      response.end("Server error");
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(listenPort, "127.0.0.1", resolve);
  });

  return server;
}

async function stopStaticServer(server) {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join(repoRoot, "logs", "tooling");
  await fsPromises.mkdir(outputDir, { recursive: true });
  const outputBase = path.join(outputDir, `lighthouse-test-interface-${timestamp}`);
  const jsonPath = `${outputBase}.json`;
  const htmlPath = `${outputBase}.html`;

  const server = await startStaticServer(repoRoot, port);

  try {
    const chromePath = findChromeExecutable();
    const env = { ...process.env };
    if (chromePath) {
      env.CHROME_PATH = chromePath;
      console.log(`Chromium Playwright: ${path.relative(repoRoot, chromePath)}`);
    }

    await runLighthouse(targetURL.toString(), outputBase, env);

    const generatedJson = `${outputBase}.report.json`;
    const generatedHtml = `${outputBase}.report.html`;

    if (fs.existsSync(generatedJson)) {
      await fsPromises.rename(generatedJson, jsonPath);
    }
    if (fs.existsSync(generatedHtml)) {
      await fsPromises.rename(generatedHtml, htmlPath);
    }

    const rawReport = await fsPromises.readFile(jsonPath, "utf8");
    const report = JSON.parse(rawReport);
    const performanceScore = Math.round((report?.categories?.performance?.score ?? 0) * 100);
    const accessibilityScore = Math.round((report?.categories?.accessibility?.score ?? 0) * 100);

    const relativeJson = path.relative(repoRoot, jsonPath);
    const relativeHtml = path.relative(repoRoot, htmlPath);

    console.log(`Lighthouse · performance ${performanceScore} · accessibilità ${accessibilityScore}`);
    console.log(`Report JSON: ${relativeJson}`);
    if (fs.existsSync(htmlPath)) {
      console.log(`Report HTML: ${relativeHtml}`);
    }
  } finally {
    await stopStaticServer(server);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
