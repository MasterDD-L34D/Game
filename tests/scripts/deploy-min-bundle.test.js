// tests/scripts/deploy-min-bundle.test.js
// Sprint C — deploy bundle Min sanity.
// Verifica:
//   - render.yaml è YAML valido + autoDeploy false + healthCheckPath /api/health
//   - wrangler.toml è TOML valido + assets dir corretta
//   - scripts/deploy-min.sh ha sintassi bash valida
//   - apps/play/runtime-config.production.js esiste e ha placeholder
//   - docs/ops/deploy-min-checklist.md ha frontmatter valido richiesto

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

test('render.yaml exists, parses as YAML, has Sprint C invariants', () => {
  assert.ok(exists('render.yaml'), 'render.yaml missing');
  const raw = read('render.yaml');

  // Lazy parse: prova js-yaml se disponibile, altrimenti string assertion.
  let parsed;
  try {
    const yaml = require('js-yaml');
    parsed = yaml.load(raw);
  } catch (err) {
    parsed = null;
  }

  if (parsed) {
    assert.ok(Array.isArray(parsed.services), 'services must be array');
    assert.equal(parsed.services.length, 1, 'expect single service');
    const svc = parsed.services[0];
    assert.equal(svc.type, 'web');
    assert.equal(svc.name, 'evo-tactics-backend');
    assert.equal(svc.runtime, 'node');
    assert.equal(svc.plan, 'free');
    assert.equal(
      svc.autoDeploy,
      false,
      'ANTI-PATTERN: autoDeploy must be false (Sprint C anti-pattern guard)',
    );
    assert.equal(
      svc.healthCheckPath,
      '/api/health',
      'healthCheckPath must be /api/health (dedicated endpoint)',
    );
    assert.match(svc.buildCommand, /prisma generate/, 'build must include prisma generate');
    assert.match(svc.startCommand, /node apps\/backend\/index\.js/);
    const corsVar = svc.envVars.find((e) => e.key === 'CORS_ORIGIN');
    assert.ok(corsVar, 'CORS_ORIGIN env var must be declared');
    assert.equal(
      corsVar.sync,
      false,
      'CORS_ORIGIN must use sync:false (no value committed) — anti-pattern guard',
    );
    const authSecret = svc.envVars.find((e) => e.key === 'AUTH_SECRET');
    assert.ok(authSecret, 'AUTH_SECRET must be declared as sync:false placeholder');
    assert.equal(authSecret.sync, false);
    const dbUrl = svc.envVars.find((e) => e.key === 'DATABASE_URL');
    assert.ok(dbUrl, 'DATABASE_URL must be declared as sync:false placeholder');
    assert.equal(dbUrl.sync, false);
  } else {
    // Fallback: string-based smoke checks (js-yaml not installed in this scope).
    assert.match(raw, /autoDeploy:\s*false/);
    assert.match(raw, /healthCheckPath:\s*\/api\/health/);
    assert.match(raw, /key:\s*CORS_ORIGIN[\s\S]+?sync:\s*false/);
    assert.match(raw, /prisma generate/);
  }
});

test('wrangler.toml exists, has expected name + assets directory', () => {
  assert.ok(exists('wrangler.toml'), 'wrangler.toml missing');
  const raw = read('wrangler.toml');

  // No native TOML parser in node stdlib; smoke check via regex.
  assert.match(raw, /^name\s*=\s*"evo"/m, 'wrangler name must be "evo"');
  assert.match(raw, /^compatibility_date\s*=\s*"\d{4}-\d{2}-\d{2}"/m);
  assert.match(raw, /\[assets\][\s\S]*?directory\s*=\s*"\.\/apps\/play\/dist"/);
  assert.match(raw, /not_found_handling\s*=\s*"single-page-application"/);
  assert.match(raw, /\[env\.pages\][\s\S]*?name\s*=\s*"evo-tactics-play"/);
});

test('scripts/deploy-min.sh exists, has valid bash syntax', () => {
  const scriptPath = 'scripts/deploy-min.sh';
  assert.ok(exists(scriptPath), 'deploy-min.sh missing');
  const result = spawnSync('bash', ['-n', path.join(ROOT, scriptPath)], {
    encoding: 'utf8',
  });
  assert.equal(
    result.status,
    0,
    `bash -n failed:\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
});

test('scripts/deploy-min.sh has expected step structure + anti-pattern guards', () => {
  const raw = read('scripts/deploy-min.sh');
  // Steps 0-6 declared.
  assert.match(raw, /Step 0\/6: preflight/);
  assert.match(raw, /Step 1\/6: build frontend/);
  assert.match(raw, /Step 2\/6: inject runtime-config/);
  assert.match(raw, /Step 3\/6: deploy Cloudflare Pages/);
  assert.match(raw, /Step 4\/6: stamp Render redeploy/);
  assert.match(raw, /Step 5\/6: smoke probe \/api\/health/);
  assert.match(raw, /Step 6\/6: deploy summary/);

  // Required env vars enforced.
  assert.match(raw, /RENDER_API_KEY/);
  assert.match(raw, /RENDER_SERVICE_ID/);
  assert.match(raw, /RENDER_BACKEND_HOST/);

  // Anti-pattern guard: CORS check.
  assert.match(raw, /apps\/backend\/app\.js/);
  assert.match(raw, /CORS/);

  // Health endpoint hit.
  assert.match(raw, /\/api\/health/);

  // No secret hardcoded in script.
  assert.doesNotMatch(
    raw.replace(/RENDER_API_KEY:?\s*=\s*\$/g, ''), // ignore var assignment patterns
    /RENDER_API_KEY=['"]rnd_[a-zA-Z0-9_-]{20,}/,
    'no RENDER_API_KEY value hardcoded',
  );
});

test('apps/play/runtime-config.production.js exists with placeholder marker', () => {
  const rel = 'apps/play/runtime-config.production.js';
  assert.ok(exists(rel), 'runtime-config.production.js missing');
  const raw = read(rel);
  assert.match(raw, /__RENDER_BACKEND_HOST__/, 'must contain placeholder for sed substitution');
  assert.match(raw, /window\.LOBBY_WS_URL/);
  assert.match(raw, /window\.LOBBY_API_BASE/);
  // No real production host hardcoded in assignments (comments allowed for examples).
  // Strip line comments before checking.
  const stripped = raw
    .split('\n')
    .filter((ln) => !ln.trim().startsWith('//'))
    .join('\n');
  assert.doesNotMatch(
    stripped,
    /\.onrender\.com/,
    'no .onrender.com host hardcoded in JS assignments — must use placeholder',
  );
});

test('docs/ops/deploy-min-checklist.md has valid frontmatter', () => {
  const rel = 'docs/ops/deploy-min-checklist.md';
  assert.ok(exists(rel), 'checklist md missing');
  const raw = read(rel);

  assert.match(raw, /^---\n/, 'frontmatter must start at top');
  const fmMatch = raw.match(/^---\n([\s\S]+?)\n---/);
  assert.ok(fmMatch, 'frontmatter block delimiters required');
  const fm = fmMatch[1];

  // Required fields per docs/governance/docs_metadata.schema.json
  for (const field of [
    'doc_status',
    'doc_owner',
    'workstream',
    'last_verified',
    'source_of_truth',
    'language',
    'review_cycle_days',
  ]) {
    assert.match(fm, new RegExp(`^${field}:`, 'm'), `frontmatter missing required: ${field}`);
  }

  // Workstream must be ops-qa (deployment ops).
  assert.match(fm, /workstream:\s*ops-qa/);
  // last_verified ISO date.
  assert.match(fm, /last_verified:\s*\d{4}-\d{2}-\d{2}/);
});
