const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ORIGINAL_SCRIPT = path.join(REPO_ROOT, 'scripts', 'sync_evo_pack_assets.js');
const ORIGINAL_JSONIO = path.join(REPO_ROOT, 'scripts', 'utils', 'jsonio.js');

// Script copies run from a temp dir without node_modules; NODE_PATH lets the
// lazy prettier require in jsonio resolve against the repo install.
const SPAWN_ENV = { ...process.env, NODE_PATH: path.join(REPO_ROOT, 'node_modules') };

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

test('sync_evo_pack_assets rewrites asset references in docs/public mirrors', (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-evo-pack-'));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const scriptsDir = path.join(tempRoot, 'scripts');
  fs.mkdirSync(path.join(scriptsDir, 'utils'), { recursive: true });
  fs.copyFileSync(ORIGINAL_SCRIPT, path.join(scriptsDir, 'sync_evo_pack_assets.js'));
  fs.copyFileSync(ORIGINAL_JSONIO, path.join(scriptsDir, 'utils', 'jsonio.js'));

  const sourcePayload = {
    schema_version: '9.9.9',
    updated_at: '2030-01-01T00:00:00Z',
    pools: [
      {
        id: 'alpha',
        manifest: { path: '../../data/traits/alpha.json' },
      },
      '../../data/loose/entry.txt',
    ],
  };

  const sourcePath = path.join(
    tempRoot,
    'packs',
    'evo_tactics_pack',
    'docs',
    'catalog',
    'catalog_data.json',
  );
  writeJson(sourcePath, sourcePayload);

  const result = spawnSync('node', [path.join(scriptsDir, 'sync_evo_pack_assets.js')], {
    cwd: tempRoot,
    encoding: 'utf8',
    env: SPAWN_ENV,
  });
  assert.equal(result.status, 0, `script should exit successfully: ${result.stderr || ''}`);

  const mirrors = [
    path.join(tempRoot, 'docs', 'evo-tactics-pack', 'catalog_data.json'),
    path.join(tempRoot, 'public', 'docs', 'evo-tactics-pack', 'catalog_data.json'),
  ];

  for (const mirror of mirrors) {
    assert.ok(fs.existsSync(mirror), `mirror file should be written: ${mirror}`);
    const content = fs.readFileSync(mirror, 'utf8');
    assert.ok(!content.includes('../../data/'), 'mirrors must not reference ../../data/');
    assert.ok(
      content.includes('../../packs/evo_tactics_pack/data/'),
      'paths should be rewritten with pack prefix',
    );

    const payload = JSON.parse(content);
    const firstPool = payload.pools?.[0];
    assert.equal(
      firstPool?.manifest?.path,
      '../../packs/evo_tactics_pack/data/traits/alpha.json',
      'rewritten manifest path should be reflected in mirror payloads',
    );
  }
});

test('sync_evo_pack_assets emits prettier-conform mirrors and skips rewrites when unchanged', (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-evo-pack-idem-'));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const scriptsDir = path.join(tempRoot, 'scripts');
  fs.mkdirSync(path.join(scriptsDir, 'utils'), { recursive: true });
  fs.copyFileSync(ORIGINAL_SCRIPT, path.join(scriptsDir, 'sync_evo_pack_assets.js'));
  fs.copyFileSync(ORIGINAL_JSONIO, path.join(scriptsDir, 'utils', 'jsonio.js'));

  const catalogDir = path.join(tempRoot, 'packs', 'evo_tactics_pack', 'docs', 'catalog');
  writeJson(path.join(catalogDir, 'catalog_data.json'), {
    schema_version: '1.0',
    pools: [{ id: 'alpha', tags: ['a', 'b'], manifest: { path: '../../data/traits/alpha.json' } }],
  });
  fs.writeFileSync(
    path.join(catalogDir, 'hazards.json'),
    '{ "hazards": ["fire", "ice"] }\n',
    'utf8',
  );

  const runSync = () => {
    const result = spawnSync('node', [path.join(scriptsDir, 'sync_evo_pack_assets.js')], {
      cwd: tempRoot,
      encoding: 'utf8',
      env: SPAWN_ENV,
    });
    assert.equal(result.status, 0, `script should exit successfully: ${result.stderr || ''}`);
  };

  runSync();

  const rewrittenMirror = path.join(tempRoot, 'docs', 'evo-tactics-pack', 'catalog_data.json');
  const copiedMirror = path.join(tempRoot, 'docs', 'evo-tactics-pack', 'hazards.json');
  const firstContent = fs.readFileSync(rewrittenMirror, 'utf8');
  assert.ok(
    firstContent.includes('["a", "b"]'),
    `short arrays must stay collapsed (prettier style), got:\n${firstContent}`,
  );

  const statsBefore = {
    rewritten: fs.statSync(rewrittenMirror).mtimeMs,
    copied: fs.statSync(copiedMirror).mtimeMs,
  };

  runSync();

  assert.equal(
    fs.readFileSync(rewrittenMirror, 'utf8'),
    firstContent,
    'second run must not change mirror content',
  );
  assert.equal(
    fs.statSync(rewrittenMirror).mtimeMs,
    statsBefore.rewritten,
    'unchanged rewritten mirror must be skipped, not rewritten in place',
  );
  assert.equal(
    fs.statSync(copiedMirror).mtimeMs,
    statsBefore.copied,
    'unchanged copied asset must be skipped, not re-copied',
  );
});

test('sync_evo_pack_assets preserves committed mirrors when source only differs in formatting', (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-evo-pack-fmt-'));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const scriptsDir = path.join(tempRoot, 'scripts');
  fs.mkdirSync(path.join(scriptsDir, 'utils'), { recursive: true });
  fs.copyFileSync(ORIGINAL_SCRIPT, path.join(scriptsDir, 'sync_evo_pack_assets.js'));
  fs.copyFileSync(ORIGINAL_JSONIO, path.join(scriptsDir, 'utils', 'jsonio.js'));

  const catalogDir = path.join(tempRoot, 'packs', 'evo_tactics_pack', 'docs', 'catalog');
  // Source in JSON.stringify style (multiline arrays), as packs/ files are.
  writeJson(path.join(catalogDir, 'hazards.json'), {
    hazards: { vento_forte: { requires_any_of: ['build_cover', 'guard_stance'] } },
  });

  // Mirrors already committed in prettier style (collapsed arrays), same semantics.
  const prettierStyle =
    '{\n  "hazards": { "vento_forte": { "requires_any_of": ["build_cover", "guard_stance"] } }\n}\n';
  const docsMirror = path.join(tempRoot, 'docs', 'evo-tactics-pack', 'hazards.json');
  const publicMirror = path.join(tempRoot, 'public', 'docs', 'evo-tactics-pack', 'hazards.json');
  for (const mirror of [docsMirror, publicMirror]) {
    fs.mkdirSync(path.dirname(mirror), { recursive: true });
    fs.writeFileSync(mirror, prettierStyle, 'utf8');
  }

  const result = spawnSync('node', [path.join(scriptsDir, 'sync_evo_pack_assets.js')], {
    cwd: tempRoot,
    encoding: 'utf8',
    env: SPAWN_ENV,
  });
  assert.equal(result.status, 0, `script should exit successfully: ${result.stderr || ''}`);

  for (const mirror of [docsMirror, publicMirror]) {
    assert.equal(
      fs.readFileSync(mirror, 'utf8'),
      prettierStyle,
      'semantically-identical mirror must keep its committed bytes (no stringify reformat)',
    );
  }
});
