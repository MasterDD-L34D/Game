#!/usr/bin/env node
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const distRoot = path.join(repoRoot, 'dist', 'evo-tactics-pack');
const packSource = path.join(repoRoot, 'docs', 'evo-tactics-pack');
const siteAssets = [
  { source: path.join(repoRoot, 'docs', 'site.css'), target: 'site.css' },
  { source: path.join(repoRoot, 'docs', 'site.js'), target: 'site.js', optional: true },
];
const packDataSource = path.join(repoRoot, 'public', 'docs', 'evo-tactics-pack');
const packDataTarget = path.join(distRoot, 'packs', 'evo_tactics_pack');
const vendorRoot = path.join(repoRoot, 'assets', 'vendor', 'evo-tactics-pack');
const offlineStub = process.argv.includes('--offline-stub');

const chartStub = `/*!\n * Chart.js compat stub generated for offline bundles.\n */\n(function (global) {\n  if (global.Chart) {\n    return;\n  }\n  function clone(value) {\n    try {\n      return JSON.parse(JSON.stringify(value));\n    } catch (error) {\n      return value;\n    }\n  }\n  function Chart(ctx, config) {\n    this.ctx = ctx;\n    this.config = config || {};\n    this.data = clone(this.config.data || { labels: [], datasets: [] });\n    this.options = clone(this.config.options || {});\n  }\n  Chart.prototype.update = function update() {\n    if (!this.ctx || typeof this.ctx.canvas === 'undefined') {\n      return;\n    }\n    const canvas = this.ctx.canvas;\n    const context = this.ctx;\n    const labels = Array.isArray(this.data.labels) ? this.data.labels : [];\n    const datasets = Array.isArray(this.data.datasets) ? this.data.datasets : [];\n    if (!labels.length || !datasets.length) {\n      context.clearRect(0, 0, canvas.width, canvas.height);\n      return;\n    }\n    const radius = Math.max(Math.min(canvas.width, canvas.height) / 2 - 24, 24);\n    const step = (Math.PI * 2) / labels.length;\n    const centerX = canvas.width / 2;\n    const centerY = canvas.height / 2;\n    context.clearRect(0, 0, canvas.width, canvas.height);\n    context.save();\n    context.translate(centerX, centerY);\n    datasets.forEach((dataset) => {\n      const values = Array.isArray(dataset.data) ? dataset.data : [];\n      if (!values.length) {\n        return;\n      }\n      context.beginPath();\n      values.forEach((value, index) => {\n        const numeric = Number.isFinite(value) ? value : 0;\n        const ratio = Math.max(numeric, 0) / 5;\n        const angle = index * step - Math.PI / 2;\n        const r = radius * ratio;\n        const x = Math.cos(angle) * r;\n        const y = Math.sin(angle) * r;\n        if (index === 0) {\n          context.moveTo(x, y);\n        } else {\n          context.lineTo(x, y);\n        }\n      });\n      context.closePath();\n      const fill = dataset.backgroundColor || 'rgba(59, 130, 246, 0.35)';\n      const border = dataset.borderColor || 'rgba(37, 99, 235, 0.8)';\n      context.fillStyle = fill;\n      context.strokeStyle = border;\n      context.lineWidth = 2;\n      context.fill();\n      context.stroke();\n    });\n    context.restore();\n  };\n  Chart.prototype.destroy = function destroy() {};\n  global.Chart = Chart;\n})(typeof window !== 'undefined' ? window : globalThis);\n`;

const html2PdfStub = `/*!\n * html2pdf.js compat stub generated for offline bundles.\n */\n(function (global) {\n  if (global.html2pdf) {\n    return;\n  }\n  function createApi() {\n    const api = {\n      from() {\n        return api;\n      },\n      set() {\n        return api;\n      },\n      toPdf() {\n        return api;\n      },\n      save(fileName) {\n        console.warn('html2pdf stub: esportazione PDF non disponibile in questa build.');\n        if (typeof document !== 'undefined' && typeof fileName === 'string') {\n          const blob = new Blob(['html2pdf stub: esportazione non disponibile'], {\n            type: 'text/plain',\n          });\n          const link = document.createElement('a');\n          link.href = URL.createObjectURL(blob);\n          link.download = fileName;\n          link.click();\n          setTimeout(() => URL.revokeObjectURL(link.href), 0);\n        }\n        return Promise.resolve();\n      },\n      outputPdf() {\n        console.warn('html2pdf stub: outputPdf() non disponibile in questa build.');\n        return Promise.resolve(null);\n      },\n    };\n    return api;\n  }\n  function html2pdf() {\n    return createApi();\n  }\n  html2pdf.create = createApi;\n  global.html2pdf = html2pdf;\n})(typeof window !== 'undefined' ? window : globalThis);\n`;

async function fileExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function rimraf(target) {
  await fs.rm(target, { recursive: true, force: true });
}

async function ensureDir(target) {
  await fs.mkdir(target, { recursive: true });
}

async function copyDir(source, destination) {
  await ensureDir(destination);
  await fs.cp(source, destination, { recursive: true });
}

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        response.resume();
        reject(new Error(`Download fallito (${response.statusCode}) da ${url}`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', async () => {
        try {
          await fs.writeFile(destination, Buffer.concat(chunks));
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
  });
}

async function ensureRuntimeAsset({ name, url, stub }) {
  const destination = path.join(distRoot, 'runtime', name);
  await ensureDir(path.dirname(destination));

  const vendorCandidate = path.join(vendorRoot, name);
  if (await fileExists(vendorCandidate)) {
    await fs.copyFile(vendorCandidate, destination);
    console.log(`✔ Copiato asset runtime da vendor: ${name}`);
    return;
  }

  if (!offlineStub && url) {
    try {
      await downloadFile(url, destination);
      console.log(`✔ Scaricato asset runtime: ${name}`);
      return;
    } catch (error) {
      console.warn(`⚠ Impossibile scaricare ${name}: ${error.message}`);
    }
  }

  if (stub) {
    await fs.writeFile(destination, stub, 'utf8');
    console.warn(
      `⚠ Utilizzo stub locale per ${name}. Sostituire con la versione ufficiale prima del deploy.`,
    );
    return;
  }

  throw new Error(`Impossibile ottenere l'asset runtime richiesto: ${name}`);
}

function patchHtmlContent(content) {
  let result = content;
  result = result.replace(/href="\.\.\/site\.css"/g, 'href="./site.css"');
  result = result.replace(/href="\.\.\/\.\.\/site\.css"/g, 'href="../site.css"');
  result = result.replace(/href="\.\.\/\.\.\/\.\.\/site\.css"/g, 'href="../../site.css"');
  result = result.replace(/href="\.\.\/index\.html"/g, 'href="index.html"');
  result = result.replace(/href="\.\.\/\.\.\/index\.html"/g, 'href="../index.html"');
  result = result.replace(/href="\.\.\/\.\.\/\.\.\/index\.html"/g, 'href="../../index.html"');
  result = result.replace(
    /https:\/\/cdn.jsdelivr.net\/npm\/chart.js@4\.4\.0\/dist\/chart\.umd\.min\.js/g,
    './runtime/chart.umd.min.js',
  );
  result = result.replace(
    /https:\/\/cdn.jsdelivr.net\/npm\/jszip@3\.10\.1\/dist\/jszip\.min\.js/g,
    './runtime/jszip.min.js',
  );
  result = result.replace(
    /https:\/\/cdnjs.cloudflare.com\/ajax\/libs\/html2pdf.js\/0\.10\.1\/html2pdf\.bundle\.min\.js[^"']*/g,
    './runtime/html2pdf.bundle.min.js',
  );
  result = result.replace(
    /(src="\.\/runtime\/html2pdf\.bundle\.min\.js"[^>]*?)\s+integrity="[^"]*"/g,
    '$1',
  );
  return result;
}

async function patchHtmlFiles(targetDir) {
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(targetDir, entry.name);
      if (entry.isDirectory()) {
        await patchHtmlFiles(fullPath);
        return;
      }
      if (entry.isFile() && entry.name.endsWith('.html')) {
        const original = await fs.readFile(fullPath, 'utf8');
        const patched = patchHtmlContent(original);
        if (patched !== original) {
          await fs.writeFile(fullPath, patched, 'utf8');
        }
      }
    }),
  );
}

async function main() {
  console.log('▶ Costruzione bundle Evo Tactics Pack in', distRoot);
  await rimraf(distRoot);
  await ensureDir(distRoot);
  await copyDir(packSource, distRoot);
  await ensureDir(path.join(distRoot, 'packs'));
  await copyDir(packDataSource, packDataTarget);
  await Promise.all(
    siteAssets.map(async ({ source, target, optional }) => {
      if (!(await fileExists(source))) {
        if (optional) return;
        throw new Error(`Asset richiesto non trovato: ${source}`);
      }
      await fs.copyFile(source, path.join(distRoot, target));
    }),
  );
  await patchHtmlFiles(distRoot);
  await Promise.all([
    ensureRuntimeAsset({
      name: 'chart.umd.min.js',
      url: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
      stub: chartStub,
    }),
    ensureRuntimeAsset({
      name: 'jszip.min.js',
      url: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
      // jszip ha sempre un fallback locale nel repository
    }),
    ensureRuntimeAsset({
      name: 'html2pdf.bundle.min.js',
      url: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
      stub: html2PdfStub,
    }),
  ]);
  console.log('✔ Bundle pronto in', distRoot);
  if (offlineStub) {
    console.warn(
      '⚠ Bundle generato in modalità offline: alcune librerie sono state sostituite con stub.',
    );
  }
}

main().catch((error) => {
  console.error('❌ Errore durante la costruzione del bundle Evo Tactics Pack');
  console.error(error);
  process.exitCode = 1;
});
