const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ORIGINAL_SCRIPT = path.join(REPO_ROOT, 'scripts', 'sync_evo_pack_assets.js');
const ORIGINAL_JSONIO = path.join(REPO_ROOT, 'scripts', 'utils', 'jsonio.js');

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
