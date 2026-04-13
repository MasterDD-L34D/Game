'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PYTHON = process.env.PYTHON || 'python';

/**
 * Mini-client per il worker ``services/rules/worker.py``.
 *
 * Spawn diretto di ``python -m services.rules.worker``. Il worker emette
 * ``ready`` all'avvio, accetta richieste JSON line su stdin con shape
 * ``{id, action, payload}`` e risponde su stdout con ``{type: "response",
 * id, status, result|error}``. Heartbeat allungato a 60s per non inquinare
 * l'output dei test.
 */
function createWorkerClient() {
  const env = {
    ...process.env,
    PYTHONIOENCODING: 'utf-8',
    RULES_WORKER_HEARTBEAT_INTERVAL_MS: '60000',
  };
  const proc = spawn(PYTHON, ['-m', 'services.rules.worker'], {
    cwd: REPO_ROOT,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const pending = new Map();
  let stdoutBuffer = '';
  let stderrBuffer = '';
  let readyResolver;
  let readyRejecter;
  const readyPromise = new Promise((resolve, reject) => {
    readyResolver = resolve;
    readyRejecter = reject;
  });

  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk;
    let newlineIdx;
    while ((newlineIdx = stdoutBuffer.indexOf('\n')) !== -1) {
      const line = stdoutBuffer.slice(0, newlineIdx).trim();
      stdoutBuffer = stdoutBuffer.slice(newlineIdx + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch (error) {
        // Ignora righe non-JSON (non dovrebbero esserci).
        continue;
      }
      if (msg.type === 'ready') {
        readyResolver(msg);
      } else if (msg.type === 'heartbeat') {
        // Nessun handling necessario per il test.
      } else if (msg.type === 'response') {
        const resolver = pending.get(msg.id);
        if (resolver) {
          pending.delete(msg.id);
          resolver(msg);
        }
      }
    }
  });

  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', (chunk) => {
    stderrBuffer += chunk;
  });

  proc.on('error', (err) => {
    if (readyRejecter) readyRejecter(err);
  });

  function send(id, action, payload) {
    return new Promise((resolve, reject) => {
      pending.set(id, resolve);
      const line = JSON.stringify({ id, action, payload }) + '\n';
      proc.stdin.write(line, 'utf8', (err) => {
        if (err) {
          pending.delete(id);
          reject(err);
        }
      });
    });
  }

  async function close() {
    if (!proc.killed && proc.exitCode === null) {
      try {
        const shutdownPromise = send('__shutdown__', 'shutdown', {});
        await Promise.race([
          shutdownPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('shutdown timeout')), 3000)),
        ]).catch(() => {});
      } catch (_err) {
        /* ignore */
      }
      try {
        proc.stdin.end();
      } catch (_err) {
        /* ignore */
      }
      await new Promise((resolve) => {
        if (proc.exitCode !== null) return resolve();
        const timer = setTimeout(() => {
          proc.kill('SIGKILL');
          resolve();
        }, 3000);
        proc.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }

  function getStderr() {
    return stderrBuffer;
  }

  return { readyPromise, send, close, getStderr };
}

function buildEncounter() {
  return {
    biome: 'test_biome',
    tb: 10,
    groups: [
      { power: 7, role: 'front', affixes: [] },
      { power: 4, role: 'support', affixes: [] },
    ],
    party_vc: {
      aggro: 'mid',
      cohesion: 'mid',
      setup: 'mid',
      explore: 'mid',
      risk: 'mid',
    },
  };
}

function buildParty() {
  return [
    {
      id: 'party-01',
      species_id: 'anguis_magnetica',
      trait_ids: ['artigli_sette_vie'],
    },
    {
      id: 'party-02',
      species_id: 'aetherloom_stalker',
      trait_ids: ['mantello_meteoritico'],
    },
  ];
}

test('rules worker emette ready e risponde a hydrate-encounter + resolve-action', async (t) => {
  const client = createWorkerClient();
  t.after(async () => {
    await client.close();
  });

  const ready = await client.readyPromise;
  assert.equal(ready.type, 'ready');
  assert.ok(ready.pid, 'ready deve includere il pid del worker');

  const hydrateResp = await client.send('h1', 'hydrate-encounter', {
    seed: 'bridge-seed-1',
    session_id: 'bridge-session',
    encounter_id: 'bridge-encounter',
    encounter: buildEncounter(),
    party: buildParty(),
    hostile_species_ids: ['shadow_beast', 'cave_dweller'],
    hostile_trait_ids: [[], []],
  });
  assert.equal(hydrateResp.status, 'ok', `hydrate errore: ${hydrateResp.error}`);
  assert.equal(hydrateResp.id, 'h1');
  const state = hydrateResp.result;
  assert.equal(state.units.length, 4, 'attesi 2 party + 2 hostile');
  assert.equal(state.turn, 1);
  const sides = state.units.map((u) => u.side);
  assert.equal(sides.filter((s) => s === 'party').length, 2);
  assert.equal(sides.filter((s) => s === 'hostile').length, 2);

  // Ogni unit ha tier (Fase 2-ter)
  for (const unit of state.units) {
    assert.ok(typeof unit.tier === 'number' && unit.tier >= 1 && unit.tier <= 6);
  }

  const attacker = state.units.find((u) => u.id === 'party-01');
  const target = state.units.find((u) => u.id === 'hostile-01');
  assert.ok(attacker && target);

  const resolveResp = await client.send('r1', 'resolve-action', {
    seed: 'bridge-seed-1',
    namespace: 'attack',
    state,
    action: {
      id: 'a-bridge-1',
      type: 'attack',
      actor_id: attacker.id,
      target_id: target.id,
      ap_cost: 1,
      channel: null,
      damage_dice: { count: 1, sides: 8, modifier: 3 },
    },
  });
  assert.equal(resolveResp.status, 'ok', `resolve errore: ${resolveResp.error}`);
  assert.equal(resolveResp.id, 'r1');
  const result = resolveResp.result;
  assert.ok(result.next_state, 'next_state presente');
  assert.ok(result.turn_log_entry, 'turn_log_entry presente');
  assert.ok(result.turn_log_entry.roll, 'roll presente (action attack)');
  const roll = result.turn_log_entry.roll;
  assert.ok(
    Number.isInteger(roll.natural) && roll.natural >= 1 && roll.natural <= 20,
    'natural d20 nel range',
  );
  assert.equal(typeof roll.success, 'boolean');
  assert.equal(typeof roll.mos, 'number');
  // L'attaccante deve avere AP scalato di 1
  const nextAttacker = result.next_state.units.find((u) => u.id === attacker.id);
  assert.equal(nextAttacker.ap.current, attacker.ap.current - 1);

  assert.equal(client.getStderr(), '', 'nessun stderr inatteso dal worker');
});

test('rules worker produce risultati deterministici con lo stesso seed/namespace', async (t) => {
  const client = createWorkerClient();
  t.after(async () => {
    await client.close();
  });

  await client.readyPromise;

  // Hydrate una volta sola (deterministico anche lui)
  const hydrateResp = await client.send('h1', 'hydrate-encounter', {
    seed: 'det-seed',
    session_id: 'det-session',
    encounter: buildEncounter(),
    party: buildParty(),
  });
  assert.equal(hydrateResp.status, 'ok');
  const state = hydrateResp.result;

  const action = {
    id: 'a-det',
    type: 'attack',
    actor_id: 'party-01',
    target_id: 'hostile-01',
    ap_cost: 1,
    channel: null,
    damage_dice: { count: 1, sides: 8, modifier: 3 },
  };

  const r1 = await client.send('r1', 'resolve-action', {
    seed: 'det-seed',
    namespace: 'attack',
    state,
    action,
  });
  const r2 = await client.send('r2', 'resolve-action', {
    seed: 'det-seed',
    namespace: 'attack',
    state,
    action,
  });
  assert.equal(r1.status, 'ok');
  assert.equal(r2.status, 'ok');
  assert.equal(
    r1.result.turn_log_entry.roll.natural,
    r2.result.turn_log_entry.roll.natural,
    'stesso seed + namespace deve produrre stesso natural',
  );
  assert.equal(
    r1.result.turn_log_entry.damage_applied,
    r2.result.turn_log_entry.damage_applied,
    'stesso seed + namespace deve produrre stesso damage_applied',
  );
});

test('rules worker risponde con status error su azione sconosciuta', async (t) => {
  const client = createWorkerClient();
  t.after(async () => {
    await client.close();
  });
  await client.readyPromise;

  const resp = await client.send('x1', 'bogus-action', {});
  assert.equal(resp.status, 'error');
  assert.equal(resp.code, 'RULES_ERROR');
  assert.match(resp.error, /non supportata/i);
});

test('rules worker risponde con status error su payload malformato', async (t) => {
  const client = createWorkerClient();
  t.after(async () => {
    await client.close();
  });
  await client.readyPromise;

  const resp = await client.send('x2', 'hydrate-encounter', {
    seed: 'bad',
    // mancano session_id, encounter, party
  });
  assert.equal(resp.status, 'error');
  assert.equal(resp.code, 'RULES_ERROR');
});

test('rules worker risolve attack con pt_spend.perforazione e parry_response', async (t) => {
  const client = createWorkerClient();
  t.after(async () => {
    await client.close();
  });
  await client.readyPromise;

  const hydrateResp = await client.send('h1', 'hydrate-encounter', {
    seed: 'ptparry-seed',
    session_id: 'ptparry-session',
    encounter: buildEncounter(),
    party: buildParty(),
  });
  assert.equal(hydrateResp.status, 'ok');
  const state = hydrateResp.result;
  // Dai PT all'attore per poter spendere
  const attacker = state.units.find((u) => u.id === 'party-01');
  attacker.pt = 5;

  const attackWithSpendAndParry = {
    id: 'a-combo',
    type: 'attack',
    actor_id: 'party-01',
    target_id: 'hostile-01',
    ap_cost: 1,
    damage_dice: { count: 1, sides: 8, modifier: 3 },
    pt_spend: { type: 'perforazione', amount: 2 },
    parry_response: { attempt: true, parry_bonus: 0 },
  };

  const resp = await client.send('r1', 'resolve-action', {
    seed: 'ptparry-seed',
    namespace: 'attack',
    state,
    action: attackWithSpendAndParry,
  });
  assert.equal(resp.status, 'ok', `errore: ${resp.error}`);
  const roll = resp.result.turn_log_entry.roll;
  assert.equal(roll.pt_spent, 2, 'pt_spent deve riflettere il consumo perforazione');
  assert.ok(roll.parry !== null, 'parry deve essere loggata (attempted)');
  // Il nuovo pt dell'attore: 5 - 2 + pt_gained (dipende dal nat ottenuto)
  const nextActor = resp.result.next_state.units.find((u) => u.id === 'party-01');
  assert.equal(
    nextActor.pt,
    5 - 2 + roll.pt_gained,
    'pt finale = pool iniziale - pt_spent + pt_gained',
  );
});
