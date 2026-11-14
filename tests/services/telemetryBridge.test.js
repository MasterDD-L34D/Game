'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');

const {
  transformRun,
  normalizeEnnea,
  buildVcSnapshotPerActor,
  deriveSessionId,
  fetchGodotBiomeFocus,
} = require('../../tools/sim/telemetry-bridge');

test('deriveSessionId(events, file)', () => {
  // 1. [{kind:'config', run_label:'lbl-7'}], file 'x/run-1.jsonl' -> 'lbl-7'.
  assert.equal(deriveSessionId([{ kind: 'config', run_label: 'lbl-7' }], 'x/run-1.jsonl'), 'lbl-7');

  // 2. [{kind:'config', run_seed:42}] -> 'seed-42'.
  assert.equal(deriveSessionId([{ kind: 'config', run_seed: 42 }], ''), 'seed-42');

  // 3. [{kind:'config', run_seed:0}] -> 'seed-0' (run_seed != null keeps 0).
  assert.equal(deriveSessionId([{ kind: 'config', run_seed: 0 }], ''), 'seed-0');

  // 4. [{kind:'config'}] (no run_label, no run_seed), file '/a/b/run-9-foo.jsonl' -> 'run-9-foo'
  assert.equal(deriveSessionId([{ kind: 'config' }], '/a/b/run-9-foo.jsonl'), 'run-9-foo');

  // 5. [], file 'run-3.jsonl' -> 'run-3'.
  assert.equal(deriveSessionId([], 'run-3.jsonl'), 'run-3');
});

test('normalizeEnnea(ennea)', () => {
  // 6. normalizeEnnea(null) -> undefined; normalizeEnnea(undefined) -> undefined.
  assert.equal(normalizeEnnea(null), undefined);
  assert.equal(normalizeEnnea(undefined), undefined);

  // 7. [{id:'helper', triggered:1}, {id:'skeptic', triggered:0}] -> deep-equal {helper:true, skeptic:false}.
  assert.deepEqual(
    normalizeEnnea([
      { id: 'helper', triggered: 1 },
      { id: 'skeptic', triggered: 0 },
    ]),
    { helper: true, skeptic: false },
  );

  // 8. [] -> undefined; [{triggered:true}] (entry without id) -> undefined.
  assert.equal(normalizeEnnea([]), undefined);
  assert.equal(normalizeEnnea([{ triggered: true }]), undefined);

  // 9. {helper:true, skeptic:{triggered:false}} -> deep-equal {helper:true, skeptic:false}.
  assert.deepEqual(normalizeEnnea({ helper: true, skeptic: { triggered: false } }), {
    helper: true,
    skeptic: false,
  });

  // 10. {} -> undefined.
  assert.equal(normalizeEnnea({}), undefined);
});

test('buildVcSnapshotPerActor(vcEv)', () => {
  // 11. {per_actor:{u1:{mbti_type:'ISTJ'}}} -> deep-equal {u1:{mbti_type:'ISTJ'}}.
  assert.deepEqual(buildVcSnapshotPerActor({ per_actor: { u1: { mbti_type: 'ISTJ' } } }), {
    u1: { mbti_type: 'ISTJ' },
  });

  // 12. alias: {vc_per_actor:{u1:{mbti_type:'ENFP'}}} -> deep-equal {u1:{mbti_type:'ENFP'}}.
  assert.deepEqual(buildVcSnapshotPerActor({ vc_per_actor: { u1: { mbti_type: 'ENFP' } } }), {
    u1: { mbti_type: 'ENFP' },
  });

  // 13. {per_actor:{u1:{foo:1}}} -> null (no recognized sub-field -> empty entry dropped -> null).
  assert.equal(buildVcSnapshotPerActor({ per_actor: { u1: { foo: 1 } } }), null);

  // 14. {} -> null.
  assert.equal(buildVcSnapshotPerActor({}), null);

  // 15. {per_actor:{u1:{conviction_axis:{utility:0.5, liberty:'x', morality:1, extra:2}}}} -> deep-equal {u1:{conviction_axis:{utility:0.5, morality:1}}}.
  assert.deepEqual(
    buildVcSnapshotPerActor({
      per_actor: { u1: { conviction_axis: { utility: 0.5, liberty: 'x', morality: 1, extra: 2 } } },
    }),
    { u1: { conviction_axis: { utility: 0.5, morality: 1 } } },
  );

  // 16. {per_actor:{u1:{sentience:{tier:'awakened'}}}} -> {u1:{sentience:{tier:'awakened'}}}; {per_actor:{u1:{sentience_tier:'dim'}}} -> {u1:{sentience:{tier:'dim'}}}.
  assert.deepEqual(
    buildVcSnapshotPerActor({ per_actor: { u1: { sentience: { tier: 'awakened' } } } }),
    { u1: { sentience: { tier: 'awakened' } } },
  );
  assert.deepEqual(buildVcSnapshotPerActor({ per_actor: { u1: { sentience_tier: 'dim' } } }), {
    u1: { sentience: { tier: 'dim' } },
  });
});

test('transformRun(events, sessionId)', () => {
  const sessionId = 's1';

  // 17. [{kind:'rest', dur_ms:120}, {kind:'player_action', action:'attack', actor:'u1'}] -> deep-equal [{session_id:'s1', action_type:'attack', actor_id:'u1', command_latency_ms:120}].
  assert.deepEqual(
    transformRun(
      [
        { kind: 'rest', dur_ms: 120 },
        { kind: 'player_action', action: 'attack', actor: 'u1' },
      ],
      sessionId,
    ),
    [{ session_id: 's1', action_type: 'attack', actor_id: 'u1', command_latency_ms: 120 }],
  );

  // 18. precedence: [{kind:'rest', dur_ms:100}, {kind:'player_action', action:'attack', actor:'u1', dur_ms:50}] -> command_latency_ms === 50.
  assert.deepEqual(
    transformRun(
      [
        { kind: 'rest', dur_ms: 100 },
        { kind: 'player_action', action: 'attack', actor: 'u1', dur_ms: 50 },
      ],
      sessionId,
    ),
    [{ session_id: 's1', action_type: 'attack', actor_id: 'u1', command_latency_ms: 50 }],
  );

  // 19. [{kind:'player_action', action:'attack', actor:'u1', command_latency_ms:0}] -> NO command_latency_ms.
  assert.deepEqual(
    transformRun(
      [{ kind: 'player_action', action: 'attack', actor: 'u1', command_latency_ms: 0 }],
      sessionId,
    ),
    [{ session_id: 's1', action_type: 'attack', actor_id: 'u1' }],
  );

  // 20. [{kind:'rest', dur_ms:100}, {kind:'player_action', action:'move', actor:'u2'}] -> [{session_id:'s1', action_type:'move', actor_id:'u2', command_latency_ms:100}].
  assert.deepEqual(
    transformRun(
      [
        { kind: 'rest', dur_ms: 100 },
        { kind: 'player_action', action: 'move', actor: 'u2' },
      ],
      sessionId,
    ),
    [{ session_id: 's1', action_type: 'move', actor_id: 'u2', command_latency_ms: 100 }],
  );

  // 21. [{kind:'player_action'}] -> [{session_id:'s1', action_type:'action', actor_id:null}].
  assert.deepEqual(transformRun([{ kind: 'player_action' }], sessionId), [
    { session_id: 's1', action_type: 'action', actor_id: null },
  ]);

  // 22. passthrough: trait_effects deep-equal ['t1'] AND pressure_tier === 0.
  assert.deepEqual(
    transformRun(
      [
        {
          kind: 'player_action',
          action: 'attack',
          actor: 'u1',
          trait_effects: ['t1'],
          pressure_tier: 0,
        },
      ],
      sessionId,
    ),
    [
      {
        session_id: 's1',
        action_type: 'attack',
        actor_id: 'u1',
        trait_effects: ['t1'],
        pressure_tier: 0,
      },
    ],
  );

  // 23. [{kind:'vc_capture', per_actor:{u1:{mbti_type:'ISTJ'}}}] -> [{session_id:'s1', event_type:'vc_snapshot', per_actor:{u1:{mbti_type:'ISTJ'}}}]; [{kind:'vc_capture', per_actor:'junk'}] -> [].
  assert.deepEqual(
    transformRun([{ kind: 'vc_capture', per_actor: { u1: { mbti_type: 'ISTJ' } } }], sessionId),
    [{ session_id: 's1', event_type: 'vc_snapshot', per_actor: { u1: { mbti_type: 'ISTJ' } } }],
  );
  assert.deepEqual(transformRun([{ kind: 'vc_capture', per_actor: 'junk' }], sessionId), []);

  // 24. promotion target_tier fallback; BOTH applied_tier:3 and target_tier:2 -> applied_tier === 3.
  assert.deepEqual(
    transformRun(
      [{ kind: 'promotion', actor_id: 'u3', job_id: 'sentinel', target_tier: 2 }],
      sessionId,
    ),
    [
      {
        session_id: 's1',
        action_type: 'promotion',
        actor_id: 'u3',
        job_id: 'sentinel',
        applied_tier: 2,
      },
    ],
  );
  assert.deepEqual(
    transformRun(
      [{ kind: 'promotion', actor_id: 'u3', job_id: 'sentinel', applied_tier: 3, target_tier: 2 }],
      sessionId,
    ),
    [
      {
        session_id: 's1',
        action_type: 'promotion',
        actor_id: 'u3',
        job_id: 'sentinel',
        applied_tier: 3,
      },
    ],
  );

  // 25. rewind with command_latency_ms; without command_latency_ms.
  assert.deepEqual(
    transformRun([{ kind: 'rewind', actor_id: 'u4', command_latency_ms: 33 }], sessionId),
    [{ session_id: 's1', action_type: 'rewind', actor_id: 'u4', command_latency_ms: 33 }],
  );
  assert.deepEqual(transformRun([{ kind: 'rewind', actor_id: 'u4' }], sessionId), [
    { session_id: 's1', action_type: 'rewind', actor_id: 'u4' },
  ]);

  // 26. skiv_pulse_fired.
  assert.deepEqual(transformRun([{ kind: 'skiv_pulse_fired', actor_id: 'u5' }], sessionId), [
    { session_id: 's1', event_type: 'skiv_pulse_fired', actor_id: 'u5', target_biome_id: '' },
  ]);

  // 27. [null, {kind:'zzz'}, {kind:'rest', dur_ms:5}] -> [].
  assert.deepEqual(
    transformRun([null, { kind: 'zzz' }, { kind: 'rest', dur_ms: 5 }], sessionId),
    [],
  );
});

test('fetchGodotBiomeFocus(localPath, overrideUrl)', async () => {
  // 28. missing local file + empty override -> graceful skip, no network call.
  const missingPath = path.join(
    os.tmpdir(),
    'tb-missing-' + Date.now() + '-' + Math.random() + '.jsonl',
  );
  const result = await fetchGodotBiomeFocus(missingPath, '');
  assert.deepEqual(result, []);
});
