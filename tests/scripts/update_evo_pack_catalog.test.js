const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ORIGINAL_SCRIPT = path.join(REPO_ROOT, 'scripts', 'update_evo_pack_catalog.js');
const ORIGINAL_JSONIO = path.join(REPO_ROOT, 'scripts', 'utils', 'jsonio.js');

// Script copies run from a temp dir without node_modules; NODE_PATH lets
// js-yaml and the lazy prettier require resolve against the repo install.
const SPAWN_ENV = { ...process.env, NODE_PATH: path.join(REPO_ROOT, 'node_modules') };

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function buildFixture(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'update-evo-pack-'));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const scriptsDir = path.join(tempRoot, 'scripts');
  fs.mkdirSync(path.join(scriptsDir, 'utils'), { recursive: true });
  fs.copyFileSync(ORIGINAL_SCRIPT, path.join(scriptsDir, 'update_evo_pack_catalog.js'));
  fs.copyFileSync(ORIGINAL_JSONIO, path.join(scriptsDir, 'utils', 'jsonio.js'));

  const packRoot = path.join(tempRoot, 'packs', 'evo_tactics_pack');
  const catalogDir = path.join(packRoot, 'docs', 'catalog');

  writeJson(path.join(catalogDir, 'catalog_data.json'), {
    schema_version: '1.0',
    ecosistema: { biomi: [{ id: 'dune' }] },
    species: [{ id: 'sp1', path: '../../data/species/sp1.yaml' }],
    biomi: [{ id: 'dune', species: [{ id: 'sp1', path: '../../data/species/sp1.yaml' }] }],
  });

  writeFile(
    path.join(packRoot, 'data', 'ecosistemi', 'meta_ecosistema_alpha.yaml'),
    'ecosistema:\n  biomi: []\n',
  );

  writeFile(
    path.join(packRoot, 'data', 'species', 'sp1.yaml'),
    [
      'display_name: Specie Uno',
      'playable_unit: true',
      'environment_affinity:',
      '  hazards_expected:',
      '    - fire',
      '    - ice',
      'derived_from_environment:',
      '  jobs_bias:',
      '    - scout',
      '',
    ].join('\n'),
  );

  const runUpdate = () => {
    const result = spawnSync('node', [path.join(scriptsDir, 'update_evo_pack_catalog.js')], {
      cwd: tempRoot,
      encoding: 'utf8',
      env: SPAWN_ENV,
    });
    assert.equal(result.status, 0, `script should exit successfully: ${result.stderr || ''}`);
  };

  return { tempRoot, packRoot, catalogDir, runUpdate };
}

test('update_evo_pack_catalog is idempotent: re-run without input changes leaves files untouched', (t) => {
  const { catalogDir, runUpdate } = buildFixture(t);

  runUpdate();

  const generated = [
    path.join(catalogDir, 'catalog_data.json'),
    path.join(catalogDir, 'species', 'sp1.json'),
    path.join(catalogDir, 'species', 'index.json'),
    path.join(catalogDir, 'species-index.json'),
  ];
  const snapshot = generated.map((filePath) => ({
    filePath,
    content: fs.readFileSync(filePath, 'utf8'),
    mtimeMs: fs.statSync(filePath).mtimeMs,
  }));

  const catalogAfterRun1 = JSON.parse(snapshot[0].content);
  assert.ok(catalogAfterRun1.generated_at, 'first run stamps generated_at');
  assert.ok(
    snapshot[0].content.includes('["fire", "ice"]'),
    `short arrays must stay collapsed (prettier style), got:\n${snapshot[0].content}`,
  );

  runUpdate();

  for (const { filePath, content, mtimeMs } of snapshot) {
    assert.equal(
      fs.readFileSync(filePath, 'utf8'),
      content,
      `re-run must not change ${path.basename(filePath)} (timestamps included)`,
    );
    assert.equal(
      fs.statSync(filePath).mtimeMs,
      mtimeMs,
      `re-run must skip the write for ${path.basename(filePath)}`,
    );
  }
});

test('update_evo_pack_catalog rewrites (with fresh timestamps) on real content change', (t) => {
  const { packRoot, catalogDir, runUpdate } = buildFixture(t);

  runUpdate();
  const catalogPath = path.join(catalogDir, 'catalog_data.json');
  const firstGeneratedAt = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).generated_at;

  const speciesYamlPath = path.join(packRoot, 'data', 'species', 'sp1.yaml');
  fs.appendFileSync(speciesYamlPath, 'description: Nuova descrizione\n', 'utf8');

  runUpdate();

  const catalogAfter = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  assert.equal(
    catalogAfter.species[0].description,
    'Nuova descrizione',
    'content change must land in the regenerated catalog',
  );
  assert.notEqual(
    catalogAfter.generated_at,
    firstGeneratedAt,
    'real content change must refresh generated_at',
  );
});
