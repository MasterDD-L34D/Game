// M-2 name-emergence call-site (#2679 residual) -- coop wire, mirror of the
// #2680 branco-trait pattern. QF2 ratified model = auto da lifecycle: Hatchling
// anonima -> Juvenile nome -> Apex nome+MBTI reveal. Lifecycle stage is not a
// coded field yet, so the coop call-site uses run progression as the PROPOSED
// stage proxy (scenario cleared -> juvenile; run completed -> apex).
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { CoopOrchestrator } = require('../../apps/backend/services/coop/coopOrchestrator');
const { emergeIdentity } = require('../../apps/backend/services/identity/identityService');

const POOL = ['Vega', 'Esca', 'Brace'];
const ALL = { allPlayerIds: ['p_a', 'p_b'] };

function partyOrch({ scenarioStack = ['enc_one', 'enc_two'] } = {}) {
  const chronicleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chron-'));
  const co = new CoopOrchestrator({
    roomCode: 'NAME',
    hostId: 'p_h',
    chronicleBaseDir: chronicleDir,
    namePool: POOL,
  });
  co.startOnboarding({ scenarioStack });
  co._setPhase('character_creation');
  const mk = (n) => ({ name: n, form_id: 'f', species_id: 's', job_id: 'guerriero' });
  co.submitCharacter('p_a', mk('PlayerNameA'), ALL);
  co.submitCharacter('p_b', mk('PlayerNameB'), ALL);
  return { co, chronicleDir };
}

function chronicleEvents(chronicleDir, runId) {
  const p = path.join(chronicleDir, `${runId}.jsonl`);
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

test('scenario cleared -> juvenile name emerges (chronicle + WS + return), player name untouched', () => {
  const { co, chronicleDir } = partyOrch();
  const runId = co.run.id;
  const result = co.advanceScenarioOrEnd();
  assert.equal(result.action, 'next_scenario');
  assert.ok(Array.isArray(result.creature_named), 'advance result carries creature_named');
  assert.equal(result.creature_named.length, 2);

  const expectedName = emergeIdentity({ id: 'pg_p_a' }, { stage: 'juvenile', pool: POOL }).name;
  const idA = co.creatureIdentities.get('pg_p_a');
  assert.equal(idA.stage, 'juvenile');
  assert.equal(idA.anonymous, false);
  assert.equal(idA.name, expectedName);
  assert.equal(idA.mbti_reveal, false);

  // player-chosen character name stays untouched (identity = additive layer)
  assert.equal(co.characters.get('p_a').name, 'PlayerNameA');

  // WS event emitted
  const wsEvents = co.log.filter((e) => e.kind === 'creature_named');
  assert.equal(wsEvents.length, 2);
  assert.equal(wsEvents[0].payload.name, expectedName);

  // chronicle JSONL written under run.id (the #2674 identity gap fix)
  const chron = chronicleEvents(chronicleDir, runId);
  assert.equal(chron.length, 2);
  assert.equal(chron[0].type, 'creature_named');
  assert.equal(chron[0].run_id, runId);
  assert.equal(chron[0].payload.mbti_reveal, false);
});

test('no name at creation nor on form_pulse all_ready (Hatchling stays anonymous)', () => {
  const { co } = partyOrch();
  co.submitFormPulse('p_a', { axes: { solitary_swarm: 0.8 } }, ALL);
  const status = co.submitFormPulse('p_b', { axes: { solitary_swarm: 0.8 } }, ALL);
  assert.equal(status.all_ready, true);
  assert.equal(co.creatureIdentities.size, 0);
  assert.equal(
    co.log.filter((e) => e.kind === 'creature_named').length,
    0,
    'no creature_named before any scenario cleared',
  );
});

test('idempotent across advances: one emit per creature, name stable', () => {
  const { co, chronicleDir } = partyOrch({ scenarioStack: ['e1', 'e2', 'e3'] });
  const runId = co.run.id;
  co.advanceScenarioOrEnd(); // cleared 1 -> juvenile (emits)
  const nameAfterFirst = co.creatureIdentities.get('pg_p_a').name;
  const second = co.advanceScenarioOrEnd(); // cleared 2 -> still juvenile (no re-emit)
  assert.equal(second.creature_named, undefined);
  assert.equal(co.creatureIdentities.get('pg_p_a').name, nameAfterFirst);
  assert.equal(co.log.filter((e) => e.kind === 'creature_named').length, 2); // 2 creatures x 1
  assert.equal(chronicleEvents(chronicleDir, runId).length, 2);
});

test('run completed -> apex MBTI reveal upgrade (second emit, same name)', () => {
  const { co, chronicleDir } = partyOrch(); // 2 scenarios
  const runId = co.run.id;
  co.advanceScenarioOrEnd(); // juvenile
  const juvenileName = co.creatureIdentities.get('pg_p_a').name;
  const final = co.advanceScenarioOrEnd(); // run complete -> apex
  assert.equal(final.action, 'ended');
  assert.equal(final.creature_named.length, 2);
  const idA = co.creatureIdentities.get('pg_p_a');
  assert.equal(idA.stage, 'apex');
  assert.equal(idA.mbti_reveal, true);
  assert.equal(idA.name, juvenileName, 'name stable across stage advance');
  const chron = chronicleEvents(chronicleDir, runId);
  assert.equal(chron.length, 4); // 2 named + 2 reveal upgrades
  assert.equal(chron[2].payload.mbti_reveal, true);
});

test('new run resets identities alongside formPulses', () => {
  const { co } = partyOrch();
  co.advanceScenarioOrEnd();
  co.advanceScenarioOrEnd(); // ended
  assert.ok(co.creatureIdentities.size > 0);
  co.startRun({ scenarioStack: ['enc_fresh'] });
  assert.equal(co.creatureIdentities.size, 0);
});

test('empty name pool -> no emit, no broken identity (edge)', () => {
  const chronicleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chron-'));
  const co = new CoopOrchestrator({
    roomCode: 'EMPT',
    hostId: 'p_h',
    chronicleBaseDir: chronicleDir,
    namePool: [],
  });
  co.startOnboarding({ scenarioStack: ['e1', 'e2'] });
  co._setPhase('character_creation');
  co.submitCharacter('p_a', { name: 'A', form_id: 'f', species_id: 's' }, ALL);
  co.submitCharacter('p_b', { name: 'B', form_id: 'f', species_id: 's' }, ALL);
  const result = co.advanceScenarioOrEnd();
  assert.equal(result.creature_named, undefined);
  assert.equal(co.log.filter((e) => e.kind === 'creature_named').length, 0);
  assert.equal(chronicleEvents(chronicleDir, co.run.id).length, 0);
});
