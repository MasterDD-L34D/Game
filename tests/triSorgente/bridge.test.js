// Q-001 T3.2 · Tri-Sorgente Bridge smoke test.
// Spawns real Python worker. Skip se python3 non disponibile.

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const { createTriSorgenteBridge } = require('../../services/triSorgente/bridge');

const pythonCheck = spawnSync('python3', ['--version'], { stdio: 'ignore' });
const pythonAvailable = pythonCheck.status === 0;

if (!pythonAvailable) {
  test('tri-sorgente bridge: skip (python3 not available)', () => {
    assert.ok(true);
  });
} else {
  test('bridge.offerCards returns valid offer payload', async () => {
    const bridge = createTriSorgenteBridge({ timeoutMs: 5000 });
    try {
      const result = await bridge.offerCards({
        actor_id: 'u1',
        biome_id: 'savana',
        recent_actions_counts: { cariche_effettuate: 3 },
        seed: 42,
      });
      assert.ok(Array.isArray(result.offers), 'offers array');
      assert.ok(result.offers.length > 0, 'offers not empty');
      assert.ok(result.offers.length <= 5, 'offers <= 5');
      for (const offer of result.offers) {
        assert.equal(typeof offer.card_id, 'string');
        assert.equal(typeof offer.score, 'number');
        assert.equal(typeof offer.softmax_prob, 'number');
        assert.ok(offer.softmax_prob >= 0 && offer.softmax_prob <= 1);
      }
      assert.ok(result.skip_economy);
      assert.equal(result.skip_economy.fg_values.length, 3);
      assert.equal(result.meta.seed, 42);
      assert.equal(result.meta.export_version, 1);
    } finally {
      await bridge.shutdown();
    }
  });

  test('bridge.offerCards deterministic with same seed', async () => {
    const bridge = createTriSorgenteBridge({ timeoutMs: 5000 });
    try {
      const payload = {
        actor_id: 'u1',
        biome_id: 'savana',
        recent_actions_counts: {},
        seed: 100,
      };
      const r1 = await bridge.offerCards(payload);
      const r2 = await bridge.offerCards(payload);
      assert.deepEqual(
        r1.offers.map((o) => o.card_id),
        r2.offers.map((o) => o.card_id),
        'same seed → same card_ids',
      );
    } finally {
      await bridge.shutdown();
    }
  });

  test('bridge throws on missing required payload fields', async () => {
    const bridge = createTriSorgenteBridge({ timeoutMs: 1000 });
    try {
      await assert.rejects(() => bridge.offerCards({}), /actor_id/);
      await assert.rejects(() => bridge.offerCards({ actor_id: 'u1' }), /biome_id/);
    } finally {
      await bridge.shutdown();
    }
  });

  test('bridge validates response against AJV schema', async () => {
    let Ajv, schema;
    try {
      Ajv = require('ajv/dist/2020');
      schema = require('../../packages/contracts/schemas/tri-sorgente.schema.json');
    } catch {
      return; // skip se AJV non disponibile
    }
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validateResponse = ajv.compile(schema.$defs.response);

    const bridge = createTriSorgenteBridge({ timeoutMs: 5000 });
    try {
      const result = await bridge.offerCards({
        actor_id: 'u1',
        biome_id: 'savana',
        recent_actions_counts: { colpi_critici: 2 },
        seed: 7,
      });
      const valid = validateResponse(result);
      if (!valid) {
        const errs = validateResponse.errors
          .map((e) => `${e.instancePath} ${e.message}`)
          .join('; ');
        assert.fail(`response invalid: ${errs}`);
      }
      assert.ok(valid);
    } finally {
      await bridge.shutdown();
    }
  });
}
