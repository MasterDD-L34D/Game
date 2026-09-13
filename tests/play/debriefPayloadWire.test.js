// 2026-05-30 P4 debrief wire — Engine LIVE / Surface DEAD fix.
//
// phaseCoordinator reads `bridge.lastDebrief` and pipes it to the debrief
// panel P4 setters, but NOTHING ever wrote `bridge.lastDebrief` — so the
// backend debrief (ennea_voices / inner_voices / conviction_badges / ennea
// archetypes) stayed hidden in real play. These tests pin the receive wire:
//   - debriefPipe.pipeDebriefToPanel routes a payload to the panel setters
//   - debriefPipe.cacheDebriefOnBridge writes bridge.lastDebrief
//   - network LobbyClient surfaces the `debrief_payload` WS broadcast
//
// All pure / fake-node — phaseCoordinator.js itself imports CSS so it cannot
// be loaded under node:test; the routing lives in CSS-free debriefPipe.js.

'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function loadPipe() {
  return import('../../apps/play/src/debriefPipe.js');
}
async function loadNetwork() {
  return import('../../apps/play/src/network.js');
}

function makeSpyPanel() {
  const calls = {};
  const rec = (name) => (arg) => {
    calls[name] = arg;
  };
  return {
    calls,
    setNarrativeEvent: rec('setNarrativeEvent'),
    setLineageEligibles: rec('setLineageEligibles'),
    setEnneaArchetypes: rec('setEnneaArchetypes'),
    setEnneaVoices: rec('setEnneaVoices'),
    setInnerVoices: rec('setInnerVoices'),
    setConvictionBadges: rec('setConvictionBadges'),
  };
}

const FULL_PAYLOAD = {
  narrative_event: { id: 'ev1', title_it: 'Eco del combattimento' },
  mating_eligibles: [{ pair: ['p_a', 'p_b'] }],
  ennea_voices: [{ actor_id: 'p_a', archetype_id: 'Architetto(5)', text: 'Modello validato.' }],
  inner_voices: [{ actor_id: 'p_a', voice_id: 'v1', mbti_pole: 'N', text: 'Vedo lo schema.' }],
  mbti_surface: { conviction_badges: { p_a: [{ id: 'utility', label: 'Utilità' }] } },
  vc_summary: { per_actor: { p_a: { ennea_archetypes: ['Architetto(5)'] } } },
};

describe('pipeDebriefToPanel — routes debrief payload to the panel setters', () => {
  test('full payload → every P4 setter receives its slice', async () => {
    const { pipeDebriefToPanel } = await loadPipe();
    const panel = makeSpyPanel();

    pipeDebriefToPanel(panel, FULL_PAYLOAD, 'p_a');

    assert.deepEqual(panel.calls.setNarrativeEvent, FULL_PAYLOAD.narrative_event);
    assert.deepEqual(panel.calls.setLineageEligibles, FULL_PAYLOAD.mating_eligibles);
    assert.deepEqual(panel.calls.setEnneaArchetypes, ['Architetto(5)']);
    assert.deepEqual(panel.calls.setEnneaVoices, FULL_PAYLOAD.ennea_voices);
    assert.deepEqual(panel.calls.setInnerVoices, FULL_PAYLOAD.inner_voices);
    assert.deepEqual(panel.calls.setConvictionBadges, FULL_PAYLOAD.mbti_surface.conviction_badges);
  });

  test('null payload → setters get empty/null so the panel hides each section', async () => {
    const { pipeDebriefToPanel } = await loadPipe();
    const panel = makeSpyPanel();

    pipeDebriefToPanel(panel, null, 'p_a');

    assert.equal(panel.calls.setNarrativeEvent, null);
    assert.deepEqual(panel.calls.setLineageEligibles, []);
    assert.equal(panel.calls.setEnneaArchetypes, null);
    assert.deepEqual(panel.calls.setEnneaVoices, []);
    assert.deepEqual(panel.calls.setInnerVoices, []);
    assert.equal(panel.calls.setConvictionBadges, null);
  });

  test('missing playerId → ennea archetypes null (cannot resolve per-actor)', async () => {
    const { pipeDebriefToPanel } = await loadPipe();
    const panel = makeSpyPanel();

    pipeDebriefToPanel(panel, FULL_PAYLOAD, null);

    assert.equal(panel.calls.setEnneaArchetypes, null);
    // non-per-actor voices still flow regardless of playerId
    assert.deepEqual(panel.calls.setEnneaVoices, FULL_PAYLOAD.ennea_voices);
    assert.deepEqual(panel.calls.setInnerVoices, FULL_PAYLOAD.inner_voices);
  });

  test('per-actor key resolves the coop unit id pg_<playerId> (Codex P2)', async () => {
    const { pipeDebriefToPanel } = await loadPipe();
    const panel = makeSpyPanel();
    // coop: buildDebriefSummary keys vc_summary.per_actor by the UNIT id
    // `pg_${player_id}` (characterToUnit), but the phone bridge only knows the
    // raw player_id — the lookup must fall back to the pg_ form or it hides.
    const payload = {
      vc_summary: { per_actor: { pg_p_a: { ennea_archetypes: ['Cacciatore(8)'] } } },
    };
    pipeDebriefToPanel(panel, payload, 'p_a');
    assert.deepEqual(panel.calls.setEnneaArchetypes, ['Cacciatore(8)']);
  });

  test('per-actor key prefers an exact playerId match over the pg_ fallback', async () => {
    const { pipeDebriefToPanel } = await loadPipe();
    const panel = makeSpyPanel();
    const payload = {
      vc_summary: {
        per_actor: {
          p_a: { ennea_archetypes: ['Exact(1)'] },
          pg_p_a: { ennea_archetypes: ['Fallback(2)'] },
        },
      },
    };
    pipeDebriefToPanel(panel, payload, 'p_a');
    assert.deepEqual(panel.calls.setEnneaArchetypes, ['Exact(1)']);
  });

  test('non-array voice fields are coerced to [] (defensive against bad shapes)', async () => {
    const { pipeDebriefToPanel } = await loadPipe();
    const panel = makeSpyPanel();

    pipeDebriefToPanel(panel, { ennea_voices: 'nope', inner_voices: { bad: 1 } }, 'p_a');

    assert.deepEqual(panel.calls.setEnneaVoices, []);
    assert.deepEqual(panel.calls.setInnerVoices, []);
  });

  test('panel missing setters → no throw (forward-compat with older panels)', async () => {
    const { pipeDebriefToPanel } = await loadPipe();
    assert.doesNotThrow(() => pipeDebriefToPanel({}, FULL_PAYLOAD, 'p_a'));
    assert.doesNotThrow(() => pipeDebriefToPanel(null, FULL_PAYLOAD, 'p_a'));
  });
});

describe('cacheDebriefOnBridge — writes bridge.lastDebrief (the missing wire)', () => {
  test('object payload → cached onto bridge.lastDebrief', async () => {
    const { cacheDebriefOnBridge } = await loadPipe();
    const bridge = { session: { player_id: 'p_a' } };

    const cached = cacheDebriefOnBridge(bridge, FULL_PAYLOAD);

    assert.equal(bridge.lastDebrief, FULL_PAYLOAD);
    assert.equal(cached, FULL_PAYLOAD);
  });

  test('null payload → does NOT clobber an existing cache', async () => {
    const { cacheDebriefOnBridge } = await loadPipe();
    const prior = { keep: 1 };
    const bridge = { session: {}, lastDebrief: prior };

    cacheDebriefOnBridge(bridge, null);

    assert.equal(bridge.lastDebrief, prior);
  });

  test('null bridge → no throw', async () => {
    const { cacheDebriefOnBridge } = await loadPipe();
    assert.doesNotThrow(() => cacheDebriefOnBridge(null, FULL_PAYLOAD));
  });
});

describe('network LobbyClient — surfaces the debrief_payload WS broadcast', () => {
  function makeClient(LobbyClient) {
    return new LobbyClient({ code: 'AAAA', playerId: 'p_a', token: 'tok' });
  }

  test('debrief_payload message → emits debrief_payload with its payload', async () => {
    const { LobbyClient } = await loadNetwork();
    const cli = makeClient(LobbyClient);
    let got = null;
    let errored = false;
    cli.on('debrief_payload', (p) => {
      got = p;
    });
    cli.on('error', () => {
      errored = true;
    });

    cli._onMessage({ data: JSON.stringify({ type: 'debrief_payload', payload: FULL_PAYLOAD }) });

    assert.deepEqual(got, FULL_PAYLOAD);
    assert.equal(errored, false, 'must not fall through to unknown_inbound_type');
  });

  test('debrief_payload with no payload → emits {} (never undefined)', async () => {
    const { LobbyClient } = await loadNetwork();
    const cli = makeClient(LobbyClient);
    let got = 'unset';
    cli.on('debrief_payload', (p) => {
      got = p;
    });

    cli._onMessage({ data: JSON.stringify({ type: 'debrief_payload' }) });

    assert.deepEqual(got, {});
  });
});
