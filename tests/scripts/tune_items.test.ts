import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(ROOT, 'scripts', 'balance', 'tune_items.js');

function createTempDir(prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return dir;
}

function removeDir(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeDataset(targetDir: string, dataset: any) {
  const datasetPath = path.join(targetDir, 'items.json');
  fs.writeFileSync(datasetPath, JSON.stringify(dataset, null, 2));
  return datasetPath;
}

test('CLI genera proposte YAML con delta e punteggi ordinati', async (t) => {
  const tempDir = createTempDir('tune-items-');
  t.after(() => removeDir(tempDir));

  const outputDir = path.join(tempDir, 'output');
  fs.mkdirSync(outputDir);

  const dataset = {
    metadata: {
      season: 'playtest-alpha',
      generated_at: '2025-10-01T09:00:00Z',
      source: 'test-suite',
    },
    rules: {
      defaults: { tolerance: 0.02, weight: 1 },
      metrics: {
        win_rate: { tolerance: 0.015, weight: 2 },
        pick_rate: { tolerance: 0.02, weight: 1 },
      },
    },
    items: [
      {
        id: 'alpha_blade',
        name: 'Alpha Blade',
        role: 'assassin',
        rarity: 'rare',
        notes: 'Soffre nelle fasi iniziali del match.',
        metrics: {
          win_rate: { current: 0.44, target: 0.5 },
          pick_rate: { current: 0.18, target: 0.2 },
        },
      },
      {
        id: 'beta_shield',
        name: 'Beta Shield',
        role: 'tank',
        rarity: 'epic',
        metrics: {
          win_rate: { current: 0.54, target: 0.5 },
          pick_rate: { current: 0.22, target: 0.2 },
        },
      },
    ],
  };

  const datasetPath = writeDataset(tempDir, dataset);
  execFileSync('node', [CLI, '--items', datasetPath, '--output', outputDir, '--tag', 'spec']);

  const files = fs.readdirSync(outputDir).filter((file) => file.endsWith('.yaml'));
  assert.equal(files.length, 1, 'deve essere generato un singolo file YAML');

  const proposalPath = path.join(outputDir, files[0]);
  const proposal = loadYaml(fs.readFileSync(proposalPath, 'utf8')) as any;

  assert.equal(proposal.summary.items_considered, 2);
  assert.ok(Array.isArray(proposal.summary.alerts), 'deve includere un riepilogo alert');
  assert.equal(proposal.summary.alerts.length >= 1, true);

  assert.equal(proposal.items[0].id, 'alpha_blade');
  assert.equal(proposal.items[0].summary.peak_severity, 'critical');
  assert.equal(proposal.items[0].metrics.win_rate.action, 'buff');
  assert.equal(proposal.items[0].metrics.win_rate.severity, 'critical');
  assert.equal(proposal.items[0].metrics.win_rate.score > proposal.items[1].metrics.win_rate.score, true);
  assert.equal(proposal.items[1].metrics.win_rate.action, 'nerf');
  assert.equal(proposal.items[1].metrics.pick_rate.severity, 'moderate');
  assert.match(
    proposal.items[1].metrics.pick_rate.recommendation,
    /Ridurre pick rate di/,
  );
});

test('modalità dry-run stampa YAML su STDOUT senza creare file', async (t) => {
  const tempDir = createTempDir('tune-items-dry-');
  t.after(() => removeDir(tempDir));

  const outputDir = path.join(tempDir, 'out');
  fs.mkdirSync(outputDir);

  const dataset = {
    items: [
      {
        id: 'gamma_staff',
        metrics: {
          win_rate: { current: 0.5, target: 0.53 },
        },
      },
    ],
  };

  const datasetPath = writeDataset(tempDir, dataset);
  const stdout = execFileSync('node', [CLI, '--items', datasetPath, '--output', outputDir, '--dry-run'], {
    encoding: 'utf8',
  });

  assert.ok(stdout.includes('summary:'), 'dry-run deve produrre YAML');
  const generated = fs.readdirSync(outputDir).filter((file) => file.endsWith('.yaml'));
  assert.equal(generated.length, 0, 'dry-run non deve scrivere file');
});

test('modalità check confronta i delta con il file più recente', async (t) => {
  const tempDir = createTempDir('tune-items-check-');
  t.after(() => removeDir(tempDir));

  const outputDir = path.join(tempDir, 'out');
  fs.mkdirSync(outputDir);

  const baseDataset = {
    items: [
      {
        id: 'delta_bow',
        metrics: {
          win_rate: { current: 0.48, target: 0.5 },
        },
      },
    ],
  };

  const datasetPath = writeDataset(tempDir, baseDataset);
  execFileSync('node', [CLI, '--items', datasetPath, '--output', outputDir]);

  const checkOk = spawnSync('node', [CLI, '--items', datasetPath, '--output', outputDir, '--check'], {
    encoding: 'utf8',
  });
  assert.equal(checkOk.status, 0, checkOk.stderr);

  const updatedDataset = {
    items: [
      {
        id: 'delta_bow',
        metrics: {
          win_rate: { current: 0.52, target: 0.5 },
        },
      },
    ],
  };
  fs.writeFileSync(datasetPath, JSON.stringify(updatedDataset, null, 2));

  const checkFail = spawnSync('node', [CLI, '--items', datasetPath, '--output', outputDir, '--check'], {
    encoding: 'utf8',
  });
  assert.notEqual(checkFail.status, 0, 'il controllo deve fallire se i delta cambiano');
  assert.ok(
    (checkFail.stderr || '').includes('non è aggiornata'),
    'il messaggio di errore deve spiegare lo scostamento',
  );
});
