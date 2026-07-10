// tests/ai/threatPreviewThreatsOnly.test.js -- telegraph threats-only (spec sez. 4.4).
// Flag ON: righe threat solo per attack su player + move dentro objective.target_zone
// (objective zone-based). Move/retreat ordinari e righe oltre-cap NON spariscono:
// diventano righe mascherate intent_type 'hidden' (contratto Codex P2 PR #3258 --
// riga assente = solo "preview non disponibile", mai "intent filtrato").
// Cap presentazione = intentsCapForPressure (conta solo le righe threat).
// Flag OFF: byte-identical, nessuna riga hidden.
'use strict';
process.env.IDEA_ENGINE_DISABLE_STATUS_REFRESH = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildThreatPreview } = require('../../apps/backend/services/ai/threatPreview');

const FLAG = 'SISTEMA_TELEGRAPH_THREATS_ONLY';
function withFlag(value, fn) {
  const prev = process.env[FLAG];
  if (value === undefined) delete process.env[FLAG];
  else process.env[FLAG] = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env[FLAG];
    else process.env[FLAG] = prev;
  }
}

function fakeSession() {
  const units = [
    { id: 's1', controlled_by: 'sistema', hp: 5, position: { x: 1, y: 1 } },
    { id: 's2', controlled_by: 'sistema', hp: 5, position: { x: 2, y: 2 } },
    { id: 's3', controlled_by: 'sistema', hp: 5, position: { x: 3, y: 3 } },
    { id: 'p1', controlled_by: 'player', hp: 9, position: { x: 5, y: 5 } },
  ];
  return {
    units,
    sistema_pressure: 50,
    encounter: { objective: { type: 'capture_point', target_zone: [7, 7, 9, 9] } },
    roundState: {
      pending_intents: [
        { unit_id: 's1', action: { type: 'attack', target_id: 'p1' } },
        { unit_id: 's2', action: { type: 'move', move_to: { x: 8, y: 8 } } },
        { unit_id: 's3', action: { type: 'move', move_to: { x: 4, y: 4 } } },
      ],
    },
  };
}

const isHidden = (r) => r.intent_type === 'hidden';

// La riga mascherata non deve trasportare NESSUN campo informativo: un
// downgrade da riga attack che conservasse target/expected_damage renderebbe
// il mask cosmetico (leak di cio' che il flag vuole nascondere).
function assertMasked(row) {
  assert.equal(row.intent_type, 'hidden');
  assert.equal(row.intent_icon, '?');
  assert.equal(row.target_id, null);
  assert.deepEqual(row.threat_tiles, []);
  assert.equal(row.expected_damage, null);
  assert.equal(row.hit_pct, null);
}

test('OFF: tutte le righe SIS come oggi (3), nessuna hidden', () => {
  withFlag(undefined, () => {
    const rows = buildThreatPreview(fakeSession());
    assert.equal(rows.length, 3);
    assert.equal(rows.filter(isHidden).length, 0, 'flag OFF byte-identical');
  });
});

test('ON: attack + move-in-zona telegrafati, move ordinario -> riga hidden', () => {
  withFlag('true', () => {
    const rows = buildThreatPreview(fakeSession());
    const threats = rows.filter((r) => !isHidden(r));
    assert.deepEqual(
      threats.map((r) => r.actor_id).sort(),
      ['s1', 's2'],
      'threat rows = attack + zone-entry',
    );
    const hidden = rows.filter(isHidden);
    assert.deepEqual(
      hidden.map((r) => r.actor_id),
      ['s3'],
      'move ordinario (s3) presente ma mascherato, non assente',
    );
    assertMasked(hidden[0]);
  });
});

test('ON: ogni unita SIS viva con intent ha ESATTAMENTE una riga', () => {
  withFlag('true', () => {
    const rows = buildThreatPreview(fakeSession());
    assert.deepEqual(
      rows.map((r) => r.actor_id).sort(),
      ['s1', 's2', 's3'],
      'riga assente = solo preview non disponibile, mai intent filtrato',
    );
  });
});

test('ON: objective non zone-based -> solo attack threat, resto hidden', () => {
  withFlag('true', () => {
    const s = fakeSession();
    s.encounter.objective = { type: 'elimination' };
    const rows = buildThreatPreview(s);
    assert.deepEqual(
      rows.filter((r) => !isHidden(r)).map((r) => r.actor_id),
      ['s1'],
      'niente zona -> solo attack telegrafato',
    );
    assert.deepEqual(
      rows.filter(isHidden).map((r) => r.actor_id).sort(),
      ['s2', 's3'],
    );
  });
});

test('ON: cap presentazione = tier (Escalated 3); oltre-cap downgrade a hidden senza leak', () => {
  withFlag('true', () => {
    const s = fakeSession();
    s.roundState.pending_intents = [1, 2, 3, 4, 5].map((i) => ({
      unit_id: `s${i}`,
      action: { type: 'attack', target_id: 'p1' },
    }));
    s.units = [
      ...[1, 2, 3, 4, 5].map((i) => ({
        id: `s${i}`,
        controlled_by: 'sistema',
        hp: 5,
        position: { x: i, y: i },
      })),
      { id: 'p1', controlled_by: 'player', hp: 9, position: { x: 5, y: 5 } },
    ];
    const rows = buildThreatPreview(s);
    const threats = rows.filter((r) => !isHidden(r));
    assert.equal(threats.length, 3, 'cap tier Escalated = 3 righe threat');
    const hidden = rows.filter(isHidden);
    assert.equal(hidden.length, 2, 'attack oltre-cap presenti come hidden, non droppati');
    // Leak check: erano attack con target_id p1 -- il downgrade li azzera.
    for (const row of hidden) assertMasked(row);
  });
});

test('ON: retreat mai telegrafato -> riga hidden mascherata', () => {
  withFlag('true', () => {
    const s = fakeSession();
    s.roundState.pending_intents = [
      { unit_id: 's1', action: { type: 'retreat', move_to: { x: 8, y: 8 } } },
    ];
    const rows = buildThreatPreview(s);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].actor_id, 's1');
    assertMasked(rows[0]);
  });
});

test('ON: unita SIS morta -> nessuna riga (neanche hidden)', () => {
  withFlag('true', () => {
    const s = fakeSession();
    s.units.find((u) => u.id === 's3').hp = 0;
    const rows = buildThreatPreview(s);
    assert.deepEqual(
      rows.map((r) => r.actor_id).sort(),
      ['s1', 's2'],
      'dead unit fuori dal preview in ogni forma',
    );
  });
});

test('ON: attack sopravvive al taglio anche se dichiarato ULTIMO; zone-move tagliato -> hidden', () => {
  withFlag('true', () => {
    // 3 zone-entry dichiarate PRIMA + 1 attack dichiarato ULTIMO, cap tier 3
    // (pressure 50, Escalated): senza la sort attack-first la slice(0, 3)
    // scarterebbe l'attack. Pinna la priorita' di presentazione.
    const s = fakeSession();
    s.units = [
      ...[1, 2, 3, 4].map((i) => ({
        id: `s${i}`,
        controlled_by: 'sistema',
        hp: 5,
        position: { x: i, y: i },
      })),
      { id: 'p1', controlled_by: 'player', hp: 9, position: { x: 5, y: 5 } },
    ];
    s.roundState.pending_intents = [
      { unit_id: 's1', action: { type: 'move', move_to: { x: 7, y: 7 } } },
      { unit_id: 's2', action: { type: 'move', move_to: { x: 8, y: 8 } } },
      { unit_id: 's3', action: { type: 'move', move_to: { x: 9, y: 9 } } },
      { unit_id: 's4', action: { type: 'attack', target_id: 'p1' } },
    ];
    const rows = buildThreatPreview(s);
    const threats = rows.filter((r) => !isHidden(r));
    assert.equal(threats.length, 3, 'cap tier Escalated = 3');
    assert.equal(threats[0].intent_type, 'attack', 'attack prioritario sopravvive alla slice');
    const hidden = rows.filter(isHidden);
    assert.equal(hidden.length, 1, 'zone-move tagliato dal cap presente come hidden');
    assertMasked(hidden[0]);
  });
});
