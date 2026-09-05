const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const prettier = require('prettier');

const { writeJsonFileFormatted } = require('../../scripts/utils/jsonio');

function makeTempDir(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jsonio-fmt-'));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  return tempRoot;
}

async function prettierConform(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const config = (await prettier.resolveConfig(filePath)) ?? {};
  return prettier.check(content, { ...config, parser: 'json' });
}

test('writeJsonFileFormatted emits prettier-conform JSON (short arrays collapsed)', async (t) => {
  const tempRoot = makeTempDir(t);
  const target = path.join(tempRoot, 'out', 'catalog.json');

  const written = await writeJsonFileFormatted(target, {
    id: 'alpha',
    tags: ['a', 'b'],
    nested: { list: [1, 2, 3] },
  });

  assert.equal(written, true, 'first write should report written=true');
  assert.ok(await prettierConform(target), 'output must pass prettier.check');
  const content = fs.readFileSync(target, 'utf8');
  assert.ok(
    content.includes('["a", "b"]'),
    `short array should be collapsed on one line, got:\n${content}`,
  );
  assert.ok(content.endsWith('\n'), 'output should end with newline');
});

test('writeJsonFileFormatted skips write when only ignored keys differ', async (t) => {
  const tempRoot = makeTempDir(t);
  const target = path.join(tempRoot, 'catalog.json');
  const ignoreKeys = ['generated_at', 'last_synced_at'];

  const v1 = {
    generated_at: '2030-01-01T00:00:00.000Z',
    species: [{ id: 'sp1', last_synced_at: '2030-01-01T00:00:00.000Z', tags: ['x'] }],
  };
  await writeJsonFileFormatted(target, v1, { ignoreKeys });
  const bytesAfterV1 = fs.readFileSync(target, 'utf8');

  const v2 = {
    generated_at: '2031-12-31T23:59:59.000Z',
    species: [{ id: 'sp1', last_synced_at: '2031-12-31T23:59:59.000Z', tags: ['x'] }],
  };
  const written = await writeJsonFileFormatted(target, v2, { ignoreKeys });

  assert.equal(written, false, 'semantically-equal payload must skip the write');
  const bytesAfterV2 = fs.readFileSync(target, 'utf8');
  assert.equal(bytesAfterV2, bytesAfterV1, 'file must keep old bytes (old timestamps preserved)');
  assert.ok(bytesAfterV2.includes('2030-01-01'), 'old timestamp survives');
});

test('writeJsonFileFormatted writes when semantic content changes', async (t) => {
  const tempRoot = makeTempDir(t);
  const target = path.join(tempRoot, 'catalog.json');
  const ignoreKeys = ['generated_at', 'last_synced_at'];

  await writeJsonFileFormatted(
    target,
    { generated_at: '2030-01-01T00:00:00.000Z', total: 1, species: [{ id: 'sp1' }] },
    { ignoreKeys },
  );

  const written = await writeJsonFileFormatted(
    target,
    {
      generated_at: '2031-12-31T23:59:59.000Z',
      total: 2,
      species: [{ id: 'sp1' }, { id: 'sp2' }],
    },
    { ignoreKeys },
  );

  assert.equal(written, true, 'semantic delta must trigger a write');
  const content = fs.readFileSync(target, 'utf8');
  assert.ok(content.includes('2031-12-31'), 'new timestamp lands with the new content');
  assert.ok(content.includes('sp2'), 'new species present');
});

test('writeJsonFileFormatted overwrites unparseable existing target', async (t) => {
  const tempRoot = makeTempDir(t);
  const target = path.join(tempRoot, 'broken.json');
  fs.writeFileSync(target, '{not json', 'utf8');

  const written = await writeJsonFileFormatted(target, { ok: true }, { ignoreKeys: [] });

  assert.equal(written, true, 'corrupt target must be rewritten');
  assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), { ok: true });
});
