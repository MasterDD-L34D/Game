// Q-001 T1.5 PR-2 · i18n parity CI test wrapper.
// Invoca tools/py/validate_i18n_parity.py e fallisce se errors > 0.

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const pythonCheck = spawnSync('python3', ['--version'], { stdio: 'ignore' });
const pythonAvailable = pythonCheck.status === 0;

if (!pythonAvailable) {
  test('i18n parity: skip (python3 not available)', () => assert.ok(true));
} else {
  test('i18n parity validator passes on data/i18n/', () => {
    const script = path.join(__dirname, '..', '..', 'tools', 'py', 'validate_i18n_parity.py');
    const result = spawnSync('python3', [script, '--root', 'data/i18n'], {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..', '..'),
    });
    if (result.status !== 0) {
      assert.fail(
        `validator exit=${result.status}\nSTDOUT: ${result.stdout}\nSTDERR: ${result.stderr}`,
      );
    }
    assert.match(result.stdout, /errors=0/);
  });

  test('i18n parity validator fails on missing key in one locale', () => {
    // Crea fixture temporanea con chiave mismatch
    const tmpRoot = path.join(__dirname, '_fixtures_tmp');
    const itDir = path.join(tmpRoot, 'it');
    const enDir = path.join(tmpRoot, 'en');
    fs.mkdirSync(itDir, { recursive: true });
    fs.mkdirSync(enDir, { recursive: true });

    try {
      fs.writeFileSync(
        path.join(itDir, 'common.json'),
        JSON.stringify({
          _meta: { locale: 'it', completion_percent: 100 },
          ui: { ok: 'Sì', extra: 'Presente' },
        }),
      );
      fs.writeFileSync(
        path.join(enDir, 'common.json'),
        JSON.stringify({ _meta: { locale: 'en', completion_percent: 100 }, ui: { ok: 'Yes' } }),
      );

      const script = path.join(__dirname, '..', '..', 'tools', 'py', 'validate_i18n_parity.py');
      const result = spawnSync('python3', [script, '--root', tmpRoot], { encoding: 'utf8' });
      assert.equal(result.status, 1, 'expected exit=1 on missing key');
      assert.match(result.stdout, /missing in locale/);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test('i18n parity validator detects interpolation mismatch', () => {
    const tmpRoot = path.join(__dirname, '_fixtures_tmp2');
    const itDir = path.join(tmpRoot, 'it');
    const enDir = path.join(tmpRoot, 'en');
    fs.mkdirSync(itDir, { recursive: true });
    fs.mkdirSync(enDir, { recursive: true });

    try {
      fs.writeFileSync(
        path.join(itDir, 'combat.json'),
        JSON.stringify({ combat: { hp: 'HP: {{current}} / {{max}}' } }),
      );
      fs.writeFileSync(
        path.join(enDir, 'combat.json'),
        JSON.stringify({ combat: { hp: 'HP: {{current}}' } }),
      );

      const script = path.join(__dirname, '..', '..', 'tools', 'py', 'validate_i18n_parity.py');
      const result = spawnSync('python3', [script, '--root', tmpRoot], { encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.match(result.stdout, /interpolation mismatch/);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  test('i18n parity validator flags TODO placeholder as warning', () => {
    const tmpRoot = path.join(__dirname, '_fixtures_tmp3');
    const itDir = path.join(tmpRoot, 'it');
    const enDir = path.join(tmpRoot, 'en');
    fs.mkdirSync(itDir, { recursive: true });
    fs.mkdirSync(enDir, { recursive: true });

    try {
      fs.writeFileSync(
        path.join(itDir, 'menu.json'),
        JSON.stringify({ menu: { start: 'Inizia' } }),
      );
      fs.writeFileSync(
        path.join(enDir, 'menu.json'),
        JSON.stringify({ menu: { start: 'TODO translate me' } }),
      );

      const script = path.join(__dirname, '..', '..', 'tools', 'py', 'validate_i18n_parity.py');
      const result = spawnSync('python3', [script, '--root', tmpRoot], { encoding: 'utf8' });
      assert.equal(result.status, 0, 'placeholder = warning, not error');
      assert.match(result.stdout, /placeholder 'TODO'/);

      const strict = spawnSync('python3', [script, '--root', tmpRoot, '--strict'], {
        encoding: 'utf8',
      });
      assert.equal(strict.status, 1, 'strict mode = warning → error');
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
}
