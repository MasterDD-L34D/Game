'use strict';

// SPEC-J slice 1 -- lethal death model (soft-death default, lethal opt-in
// mission-flag + per-player consent, fallen-state mutation). Pure module: no
// chronicle I/O here (the wire site emits creature_fell). Default-OFF: with the
// kill switch unset every KO resolves to `soft` -> byte-identical to today.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const lethalDeath = require('../../../apps/backend/services/combat/lethalDeath');

function playerUnit(over = {}) {
  return { id: 'p1', controlled_by: 'player', is_minion: false, hp: 0, status: {}, ...over };
}

// --- env kill switch -----------------------------------------------------

function withLethalEnv(value, fn) {
  const prev = process.env.LETHAL_MISSIONS_ENABLED;
  if (value === undefined) delete process.env.LETHAL_MISSIONS_ENABLED;
  else process.env.LETHAL_MISSIONS_ENABLED = value;
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env.LETHAL_MISSIONS_ENABLED;
    else process.env.LETHAL_MISSIONS_ENABLED = prev;
  }
}

test('isLethalEnabled: default OFF (unset / anything but "true")', () => {
  withLethalEnv(undefined, () => assert.equal(lethalDeath.isLethalEnabled(), false));
  withLethalEnv('false', () => assert.equal(lethalDeath.isLethalEnabled(), false));
  withLethalEnv('1', () => assert.equal(lethalDeath.isLethalEnabled(), false));
  withLethalEnv('true', () => assert.equal(lethalDeath.isLethalEnabled(), true));
});

test('isMissionLethal: only when session.lethal === true (strict)', () => {
  assert.equal(lethalDeath.isMissionLethal({ lethal: true }), true);
  assert.equal(lethalDeath.isMissionLethal({ lethal: false }), false);
  assert.equal(lethalDeath.isMissionLethal({ lethal: 'true' }), false); // no string coercion
  assert.equal(lethalDeath.isMissionLethal({}), false);
  assert.equal(lethalDeath.isMissionLethal(null), false);
});

// --- resolveKoOutcome (pure decision) ------------------------------------

test('resolveKoOutcome: not a KO -> soft', () => {
  withLethalEnv('true', () => {
    const out = lethalDeath.resolveKoOutcome(playerUnit(), {
      missionLethal: true,
      consentGranted: true,
      isKo: false,
    });
    assert.equal(out.outcome, 'soft');
    assert.equal(out.reason, 'not_ko');
  });
});

test('resolveKoOutcome: minion is never killed (B5 expendable) -> soft', () => {
  withLethalEnv('true', () => {
    const out = lethalDeath.resolveKoOutcome(playerUnit({ is_minion: true }), {
      missionLethal: true,
      consentGranted: true,
      isKo: true,
    });
    assert.equal(out.outcome, 'soft');
    assert.equal(out.reason, 'not_player');
  });
});

test('resolveKoOutcome: non-player (sistema/enemy) -> soft', () => {
  withLethalEnv('true', () => {
    const out = lethalDeath.resolveKoOutcome(playerUnit({ controlled_by: 'sistema' }), {
      missionLethal: true,
      consentGranted: true,
      isKo: true,
    });
    assert.equal(out.outcome, 'soft');
    assert.equal(out.reason, 'not_player');
  });
});

test('resolveKoOutcome: kill switch OFF -> soft even with mission lethal + consent', () => {
  withLethalEnv('false', () => {
    const out = lethalDeath.resolveKoOutcome(playerUnit(), {
      missionLethal: true,
      consentGranted: true,
      isKo: true,
    });
    assert.equal(out.outcome, 'soft');
    assert.equal(out.reason, 'lethal_disabled');
  });
});

test('resolveKoOutcome: mission not lethal -> soft (default soft-death)', () => {
  withLethalEnv('true', () => {
    const out = lethalDeath.resolveKoOutcome(playerUnit(), {
      missionLethal: false,
      consentGranted: true,
      isKo: true,
    });
    assert.equal(out.outcome, 'soft');
    assert.equal(out.reason, 'mission_not_lethal');
  });
});

test('resolveKoOutcome: lethal mission WITHOUT consent -> soft (anti-deadlock fallback)', () => {
  withLethalEnv('true', () => {
    const out = lethalDeath.resolveKoOutcome(playerUnit(), {
      missionLethal: true,
      consentGranted: false,
      isKo: true,
    });
    assert.equal(out.outcome, 'soft');
    assert.equal(out.reason, 'no_consent');
  });
});

test('resolveKoOutcome: enabled + lethal + consent + KO of a player -> death', () => {
  withLethalEnv('true', () => {
    const out = lethalDeath.resolveKoOutcome(playerUnit(), {
      missionLethal: true,
      consentGranted: true,
      isKo: true,
    });
    assert.equal(out.outcome, 'death');
    assert.equal(out.reason, 'lethal_consented');
  });
});

test('resolveKoOutcome: bad unit -> soft, never throws', () => {
  withLethalEnv('true', () => {
    assert.equal(
      lethalDeath.resolveKoOutcome(null, { missionLethal: true, consentGranted: true, isKo: true })
        .outcome,
      'soft',
    );
  });
});

// --- markCreatureFallen (state mutation, pure of I/O) --------------------

test('markCreatureFallen: sets fallen state, hp=0, returns descriptor', () => {
  const u = playerUnit({ hp: 5, species_id: 'dune_stalker', name: 'Skiv' });
  const desc = lethalDeath.markCreatureFallen(u, { encounter_id: 'enc_x', turn: 4 });
  assert.equal(u.status.fallen, true);
  assert.equal(u.alive, false);
  assert.equal(u.hp, 0);
  assert.equal(desc.fallen, true);
  assert.equal(desc.creature_id, 'p1');
  assert.equal(desc.creature_name, 'Skiv');
  assert.equal(desc.species_id, 'dune_stalker');
  assert.equal(desc.encounter_id, 'enc_x');
  assert.equal(desc.turn, 4);
});

test('markCreatureFallen: idempotent (already fallen -> no error, stays fallen)', () => {
  const u = playerUnit({ status: { fallen: true } });
  const desc = lethalDeath.markCreatureFallen(u, {});
  assert.equal(u.status.fallen, true);
  assert.equal(desc.fallen, true);
  assert.equal(desc.already_fallen, true);
});

test('markCreatureFallen: bad input -> { fallen:false }, never throws', () => {
  assert.equal(lethalDeath.markCreatureFallen(null, {}).fallen, false);
  assert.equal(lethalDeath.markCreatureFallen({}, {}).fallen, false); // no id
});

// --- isConsentGranted -----------------------------------------------------

test('isConsentGranted: only when session.lethalConsent.granted === true', () => {
  assert.equal(lethalDeath.isConsentGranted({ lethalConsent: { granted: true } }), true);
  assert.equal(lethalDeath.isConsentGranted({ lethalConsent: { granted: false } }), false);
  assert.equal(lethalDeath.isConsentGranted({ lethalConsent: {} }), false);
  assert.equal(lethalDeath.isConsentGranted({}), false); // absent today (PR2 produces it)
  assert.equal(lethalDeath.isConsentGranted(null), false);
});

// --- applyLethalKoIfDead (thin wire orchestrator, injectable emitter) ------

function fakeEmitter() {
  const calls = [];
  const fn = (ctx) => {
    calls.push(ctx);
    return { ok: true };
  };
  fn.calls = calls;
  return fn;
}

function lethalSession(over = {}) {
  return {
    lethal: true,
    campaign_id: 'camp_1',
    encounter_id: 'enc_lethal_01',
    turn: 6,
    biome_id: 'badlands',
    lethalConsent: { granted: true },
    ...over,
  };
}

test('applyLethalKoIfDead: target not KO (hp>0) -> soft, no emit, not fallen', () => {
  withLethalEnv('true', () => {
    const u = playerUnit({ hp: 3 });
    const emit = fakeEmitter();
    const r = lethalDeath.applyLethalKoIfDead(u, lethalSession(), { emitCreatureFell: emit });
    assert.equal(r.outcome, 'soft');
    assert.equal(emit.calls.length, 0);
    assert.notEqual(u.status.fallen, true);
  });
});

test('applyLethalKoIfDead: kill switch OFF (default) -> soft, not fallen, no emit (band-neutral)', () => {
  withLethalEnv(undefined, () => {
    const u = playerUnit({ hp: 0 });
    const emit = fakeEmitter();
    const r = lethalDeath.applyLethalKoIfDead(u, lethalSession(), { emitCreatureFell: emit });
    assert.equal(r.outcome, 'soft');
    assert.equal(r.reason, 'lethal_disabled');
    assert.equal(emit.calls.length, 0);
    assert.notEqual(u.status.fallen, true);
  });
});

test('applyLethalKoIfDead: enabled + lethal + consent + player KO -> death, fallen, emits creature ctx', () => {
  withLethalEnv('true', () => {
    const u = playerUnit({ hp: 0, name: 'Skiv', species_id: 'dune_stalker' });
    const emit = fakeEmitter();
    const r = lethalDeath.applyLethalKoIfDead(u, lethalSession(), { emitCreatureFell: emit });
    assert.equal(r.outcome, 'death');
    assert.equal(r.fallen, true);
    assert.equal(u.status.fallen, true);
    assert.equal(emit.calls.length, 1);
    assert.equal(emit.calls[0].campaign_id, 'camp_1');
    assert.equal(emit.calls[0].creature_id, 'p1');
    assert.equal(emit.calls[0].creature_name, 'Skiv');
    assert.equal(emit.calls[0].encounter_id, 'enc_lethal_01');
    assert.equal(emit.calls[0].turn, 6);
    // biome falls back to the session biome when the unit carries none.
    assert.equal(emit.calls[0].biome_id, 'badlands');
  });
});

test('applyLethalKoIfDead: lethal mission WITHOUT consent -> soft, not fallen, no emit', () => {
  withLethalEnv('true', () => {
    const u = playerUnit({ hp: 0 });
    const emit = fakeEmitter();
    const r = lethalDeath.applyLethalKoIfDead(
      u,
      lethalSession({ lethalConsent: { granted: false } }),
      {
        emitCreatureFell: emit,
      },
    );
    assert.equal(r.outcome, 'soft');
    assert.equal(r.reason, 'no_consent');
    assert.equal(emit.calls.length, 0);
    assert.notEqual(u.status.fallen, true);
  });
});

test('applyLethalKoIfDead: a throwing emitter still records the death (chronicle best-effort)', () => {
  withLethalEnv('true', () => {
    const u = playerUnit({ hp: 0 });
    const boom = () => {
      throw new Error('chronicle down');
    };
    const r = lethalDeath.applyLethalKoIfDead(u, lethalSession(), { emitCreatureFell: boom });
    assert.equal(r.outcome, 'death');
    assert.equal(r.fallen, true);
    assert.equal(u.status.fallen, true);
  });
});
