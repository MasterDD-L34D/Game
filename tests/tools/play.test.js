// Play CLI unit tests — parser + renderer pure functions.
// (No HTTP calls — integration via real backend = manual/e2e separate.)

const test = require('node:test');
const assert = require('node:assert/strict');

const { parseInput, renderGrid, renderUnits, renderState } = require('../../tools/js/play.js');

// ─────────────────────────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────────────────────────

test('parseInput: comandi vuoti', () => {
  assert.equal(parseInput('').kind, 'noop');
  assert.equal(parseInput('   ').kind, 'noop');
});

test('parseInput: end/quit/state/help', () => {
  assert.equal(parseInput('end').kind, 'end');
  assert.equal(parseInput('fine').kind, 'end');
  assert.equal(parseInput('quit').kind, 'quit');
  assert.equal(parseInput('q').kind, 'quit');
  assert.equal(parseInput('state').kind, 'state');
  assert.equal(parseInput('stato').kind, 'state');
  assert.equal(parseInput('help').kind, 'help');
  assert.equal(parseInput('?').kind, 'help');
});

test('parseInput: move con coord', () => {
  const r = parseInput('p_scout: move [3,4]');
  assert.equal(r.kind, 'move');
  assert.equal(r.actor_id, 'p_scout');
  assert.deepEqual(r.position, { x: 3, y: 4 });
});

test('parseInput: move shorthand mv', () => {
  const r = parseInput('p1: mv [0,0]');
  assert.equal(r.kind, 'move');
  assert.deepEqual(r.position, { x: 0, y: 0 });
});

test('parseInput: move con spazi extra', () => {
  const r = parseInput('p_tank:   move   [ 2 , 3 ]');
  assert.equal(r.kind, 'move');
  assert.deepEqual(r.position, { x: 2, y: 3 });
});

test('parseInput: move errore senza coord', () => {
  const r = parseInput('p_scout: move');
  assert.equal(r.kind, 'error');
  assert.match(r.msg, /move richiede/);
});

test('parseInput: attack con target', () => {
  const r = parseInput('p_scout: atk e_nomad_1');
  assert.equal(r.kind, 'attack');
  assert.equal(r.actor_id, 'p_scout');
  assert.equal(r.target_id, 'e_nomad_1');
});

test('parseInput: attack shorthand attack/attacca', () => {
  assert.equal(parseInput('p_scout: attack e_hunter').kind, 'attack');
  assert.equal(parseInput('p_scout: attacca e_hunter').kind, 'attack');
});

test('parseInput: attack errore senza target', () => {
  const r = parseInput('p_scout: atk');
  assert.equal(r.kind, 'error');
});

test('parseInput: ability con target', () => {
  const r = parseInput('p_scout: ability dash_strike target=e_hunter');
  assert.equal(r.kind, 'ability');
  assert.equal(r.actor_id, 'p_scout');
  assert.equal(r.ability_id, 'dash_strike');
  assert.equal(r.target_id, 'e_hunter');
});

test('parseInput: ability senza target', () => {
  const r = parseInput('p_tank: ability fortify');
  assert.equal(r.kind, 'ability');
  assert.equal(r.ability_id, 'fortify');
  assert.equal(r.target_id, null);
});

test('parseInput: ability shorthand ab', () => {
  const r = parseInput('p_scout: ab dash_strike target=e1');
  assert.equal(r.kind, 'ability');
  assert.equal(r.ability_id, 'dash_strike');
});

test('parseInput: verbo sconosciuto', () => {
  const r = parseInput('p_scout: teleport e_nomad_1');
  assert.equal(r.kind, 'error');
  assert.match(r.msg, /non supportato/);
});

test('parseInput: sintassi rotta', () => {
  const r = parseInput('random garbage here');
  assert.equal(r.kind, 'error');
});

// ─────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────

function mockState() {
  return {
    turn: 2,
    active_unit: 'p_scout',
    grid: { width: 8, height: 8 },
    units: [
      {
        id: 'p_scout',
        hp: 8,
        max_hp: 10,
        ap: 3,
        ap_remaining: 2,
        position: { x: 1, y: 2 },
        controlled_by: 'player',
        job: 'skirmisher',
      },
      {
        id: 'p_tank',
        hp: 12,
        max_hp: 12,
        ap: 3,
        ap_remaining: 3,
        position: { x: 1, y: 3 },
        controlled_by: 'player',
        job: 'vanguard',
      },
      {
        id: 'e_nomad_1',
        hp: 0,
        max_hp: 3,
        ap: 2,
        ap_remaining: 0,
        position: { x: 4, y: 1 },
        controlled_by: 'sistema',
      },
      {
        id: 'e_hunter',
        hp: 6,
        max_hp: 6,
        ap: 2,
        ap_remaining: 2,
        position: { x: 3, y: 3 },
        controlled_by: 'sistema',
      },
    ],
  };
}

test('renderGrid: contiene header colonne + righe', () => {
  const out = renderGrid(mockState());
  assert.match(out, /0\s+1\s+2\s+3\s+4/);
  // Row 0 exists at bottom
  assert.match(out, /\n\s*0\s+/);
  // Row 7 at top
  assert.match(out, /^\s+0\s+1/);
});

test('renderGrid: place units at correct cells', () => {
  const out = renderGrid(mockState());
  // p_scout abbreviated to "p_" (2 chars of id)
  assert.ok(out.includes('p_'));
  // e_hunter → "e_"
  assert.ok(out.includes('e_'));
  // dead unit uses skull
  assert.ok(out.includes('☠'));
});

test('renderUnits: include HP bar e AP', () => {
  const out = renderUnits(mockState());
  assert.match(out, /p_scout/);
  assert.match(out, /8\/10/);
  assert.match(out, /AP 2\/3/);
  assert.match(out, /\[1,2\]/);
  assert.match(out, /skirmisher/);
});

test('renderUnits: dead unit flagged', () => {
  const out = renderUnits(mockState());
  assert.match(out, /e_nomad_1.*DEAD/);
});

test('renderUnits: active unit marker', () => {
  const out = renderUnits(mockState());
  // p_scout active → ▶ prefix
  assert.match(out, /▶.*p_scout/s);
});

test('renderState: include turn + grid + units', () => {
  const out = renderState(mockState());
  assert.match(out, /Turn 2/);
  assert.match(out, /p_scout/);
  assert.ok(out.includes('AP'));
});

test('renderState: empty units', () => {
  const out = renderState({ turn: 1, grid: { width: 4, height: 4 }, units: [] });
  assert.match(out, /Turn 1/);
});
