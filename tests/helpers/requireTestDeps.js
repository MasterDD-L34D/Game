// tests/helpers/requireTestDeps.js -- fail-closed guard for optional npm test deps.
//
// Several CI-wired suites used to soft-skip (green placeholder test +
// process.exit(0)) when an npm dep like ajv or js-yaml could not be required.
// If node_modules is broken (partial npm ci, dep drop) the gate then passes
// without validating anything -- same false-green class as the
// verify-swarm-claims --strict silent-exit-0 fixed in PR #2915.
//
// Policy: in a gate context (CI=true on GitHub Actions, RUN_TEST_API=1 set by
// scripts/run-test-api.cjs) a missing dep is an explicit FAILURE. Local runs
// fail too by default (run npm ci); a soft skip must be opted into with
// ALLOW_MISSING_DEP_SKIP=1 and never applies in a gate context.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function inGateContext(env = process.env) {
  return env.CI === 'true' || env.CI === '1' || env.RUN_TEST_API === '1';
}

// deps: map of local name -> module id, e.g. { Ajv: 'ajv/dist/2020', yaml: 'js-yaml' }.
// Returns { ok, mods }. When ok is false a failing (or, with local opt-in,
// skipping) test has already been registered here; the caller must not run the
// dep-dependent tests (early return, or per-test guard on the null module).
function requireTestDeps(label, deps) {
  const mods = {};
  const missing = [];
  for (const [name, id] of Object.entries(deps)) {
    try {
      mods[name] = require(id);
    } catch (err) {
      missing.push(`${id} (${err && err.code ? err.code : err})`);
    }
  }
  if (missing.length === 0) {
    return { ok: true, mods };
  }
  const detail = missing.join(', ');
  if (!inGateContext() && process.env.ALLOW_MISSING_DEP_SKIP === '1') {
    test(`${label}: skip, missing deps [${detail}] (ALLOW_MISSING_DEP_SKIP=1)`, () => {
      assert.ok(true);
    });
  } else {
    test(`${label}: missing required test deps`, () => {
      assert.fail(
        `Cannot require: ${detail}. Run npm ci. A soft skip is only allowed in ` +
          'local runs with ALLOW_MISSING_DEP_SKIP=1 (never in CI / run-test-api: ' +
          'a skipped suite there is a false-green gate).',
      );
    });
  }
  return { ok: false, mods };
}

module.exports = { requireTestDeps, inGateContext };
