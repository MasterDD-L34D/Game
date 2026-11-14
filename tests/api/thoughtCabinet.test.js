// P4 Thought Cabinet — pure evaluator tests.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadThoughts,
  resetCache,
  evaluateThoughts,
  thoughtsByAxis,
  describeThought,
  matchesThreshold,
  DEFAULT_SLOTS_MAX,
  RESEARCH_ROUND_MULTIPLIER,
  createCabinetState,
  slotsUsed,
  canResearchMore,
  resolveResearchCost,
  mergeUnlocked,
  startResearch,
  tickResearch,
  tickAllResearch,
  forgetThought,
  passiveBonuses,
  snapshotCabinet,
} = require('../../apps/backend/services/thoughts/thoughtCabinet');

test('loadThoughts: returns 18 thoughts across 3 axes (E_I + S_N + J_P)', () => {
  resetCache();
  const catalog = loadThoughts();
  const ids = Object.keys(catalog.thoughts);
  assert.equal(ids.length, 18);
  const by = thoughtsByAxis(catalog);
  assert.equal(by.E_I.length, 6);
  assert.equal(by.S_N.length, 6);
  assert.equal(by.J_P.length, 6);
  assert.equal(by.T_F.length, 0);
});

test('loadThoughts: every entry has axis + direction + threshold + title_it', () => {
  resetCache();
  const catalog = loadThoughts();
  for (const [id, e] of Object.entries(catalog.thoughts)) {
    assert.ok(e.axis, `${id} missing axis`);
    assert.ok(['low', 'high'].includes(e.direction), `${id} bad direction`);
    assert.equal(typeof e.threshold, 'number', `${id} bad threshold`);
    assert.ok(e.title_it, `${id} missing title_it`);
    assert.ok(e.flavor_it, `${id} missing flavor_it`);
    assert.ok([1, 2, 3].includes(e.tier), `${id} bad tier`);
  }
});

test('matchesThreshold: low direction matches when value ≤ threshold', () => {
  assert.equal(matchesThreshold(0.3, 'low', 0.35), true);
  assert.equal(matchesThreshold(0.35, 'low', 0.35), true);
  assert.equal(matchesThreshold(0.4, 'low', 0.35), false);
});

test('matchesThreshold: high direction matches when value ≥ threshold', () => {
  assert.equal(matchesThreshold(0.7, 'high', 0.65), true);
  assert.equal(matchesThreshold(0.65, 'high', 0.65), true);
  assert.equal(matchesThreshold(0.6, 'high', 0.65), false);
});

test('matchesThreshold: null/undefined/NaN never match', () => {
  assert.equal(matchesThreshold(null, 'low', 0.5), false);
  assert.equal(matchesThreshold(undefined, 'high', 0.5), false);
  assert.equal(matchesThreshold(NaN, 'low', 0.5), false);
});

test('evaluateThoughts: no axes → empty', () => {
  const res = evaluateThoughts(null);
  assert.deepEqual(res, { unlocked: [], newly: [] });
});

test('evaluateThoughts: E extreme (0.12) unlocks all 3 E tiers', () => {
  resetCache();
  const axes = { E_I: { value: 0.12, coverage: 'full' } };
  const { unlocked, newly } = evaluateThoughts(axes);
  assert.ok(unlocked.includes('e_voce_collettiva'));
  assert.ok(unlocked.includes('e_scintilla_carisma'));
  assert.ok(unlocked.includes('e_campione_folla'));
  assert.equal(newly.length, 3);
  // opposite pole must NOT unlock
  assert.ok(!unlocked.includes('i_osservatore'));
});

test('evaluateThoughts: I moderate (0.68) unlocks only tier 1', () => {
  const axes = { E_I: { value: 0.68, coverage: 'full' } };
  const { unlocked } = evaluateThoughts(axes);
  assert.ok(unlocked.includes('i_osservatore'));
  assert.ok(!unlocked.includes('i_calcolo_silente'));
  assert.ok(!unlocked.includes('i_lupo_solitario'));
});

test('evaluateThoughts: cumulative — alreadyUnlocked not duplicated in newly', () => {
  // value 0.2 unlocks tier1 (0.35) + tier2 (0.25) but not tier3 (0.15).
  const axes = { E_I: { value: 0.2, coverage: 'full' } };
  const already = ['e_voce_collettiva'];
  const { unlocked, newly } = evaluateThoughts(axes, already);
  assert.ok(!newly.includes('e_voce_collettiva'));
  assert.ok(newly.includes('e_scintilla_carisma'));
  assert.equal(newly.length, 1);
  assert.equal(unlocked.length, 2);
});

test('evaluateThoughts: dead-band (0.5) unlocks nothing', () => {
  const axes = {
    E_I: { value: 0.5, coverage: 'full' },
    S_N: { value: 0.5, coverage: 'full' },
    J_P: { value: 0.5, coverage: 'full' },
  };
  const { unlocked, newly } = evaluateThoughts(axes);
  assert.equal(unlocked.length, 0);
  assert.equal(newly.length, 0);
});

test('evaluateThoughts: null axis value skipped cleanly', () => {
  const axes = {
    E_I: { value: null, coverage: 'full' },
    S_N: { value: 0.9, coverage: 'full' },
  };
  const { unlocked } = evaluateThoughts(axes);
  // S 0.9 → passes all 3 S thresholds (0.65, 0.75, 0.85)
  assert.ok(unlocked.includes('s_occhio_pratico'));
  assert.ok(unlocked.includes('s_metodologia_ferro'));
  assert.ok(unlocked.includes('s_veterano_terreno'));
  // E_I null → no E/I thought
  assert.ok(!unlocked.includes('e_voce_collettiva'));
  assert.ok(!unlocked.includes('i_osservatore'));
});

test('evaluateThoughts: mixed axes with partial coverage', () => {
  const axes = {
    E_I: { value: 0.2, coverage: 'full' },
    S_N: { value: 0.7, coverage: 'partial' },
    J_P: { value: 0.3, coverage: 'partial' },
  };
  const { unlocked } = evaluateThoughts(axes);
  // E 0.2 → tier 1+2 (0.35, 0.25); tier 3 (0.15) NO
  assert.ok(unlocked.includes('e_voce_collettiva'));
  assert.ok(unlocked.includes('e_scintilla_carisma'));
  assert.ok(!unlocked.includes('e_campione_folla'));
  // S 0.7 → tier 1 only (0.65)
  assert.ok(unlocked.includes('s_occhio_pratico'));
  assert.ok(!unlocked.includes('s_metodologia_ferro'));
  // P 0.3 → tier 1 (0.35) only
  assert.ok(unlocked.includes('p_adattatore'));
  assert.ok(!unlocked.includes('p_improvvisatore'));
});

test('describeThought: returns shape with id + all fields', () => {
  const d = describeThought('e_voce_collettiva');
  assert.equal(d.id, 'e_voce_collettiva');
  assert.equal(d.axis, 'E_I');
  assert.equal(d.direction, 'low');
  assert.equal(d.tier, 1);
  assert.ok(d.title_it);
});

test('describeThought: unknown id → null', () => {
  assert.equal(describeThought('nope_missing'), null);
});

test('evaluateThoughts: Set input for alreadyUnlocked works', () => {
  const axes = { E_I: { value: 0.1, coverage: 'full' } };
  const already = new Set(['e_voce_collettiva']);
  const { unlocked, newly } = evaluateThoughts(axes, already);
  assert.equal(unlocked.length, 3);
  assert.equal(newly.length, 2);
});

test('evaluateThoughts: axes value exactly at threshold is inclusive', () => {
  const axes = { E_I: { value: 0.35, coverage: 'full' } };
  const { unlocked } = evaluateThoughts(axes);
  assert.ok(unlocked.includes('e_voce_collettiva'));
});

// ─────────────────────────────────────────────────────────
// Phase 2 — Disco Elysium internalization (research timer + slots + effects)
// ─────────────────────────────────────────────────────────

test('createCabinetState: defaults to 8 slots (Sprint 6 round-mode), empty collections', () => {
  const s = createCabinetState();
  assert.equal(s.slots_max, DEFAULT_SLOTS_MAX);
  assert.equal(s.slots_max, 8);
  assert.equal(s.unlocked.size, 0);
  assert.equal(s.internalized.size, 0);
  assert.equal(s.researching.size, 0);
  assert.equal(slotsUsed(s), 0);
  assert.equal(canResearchMore(s), true);
});

test('createCabinetState: slotsMax override clamps to >=1 and floors', () => {
  assert.equal(createCabinetState({ slotsMax: 5 }).slots_max, 5);
  assert.equal(createCabinetState({ slotsMax: 2.9 }).slots_max, 2);
  assert.equal(createCabinetState({ slotsMax: 0 }).slots_max, 1);
  assert.equal(createCabinetState({ slotsMax: -3 }).slots_max, 1);
});

test('mergeUnlocked: adds new ids, ignores empty input', () => {
  const s = createCabinetState();
  mergeUnlocked(s, ['a', 'b']);
  assert.equal(s.unlocked.size, 2);
  mergeUnlocked(s, []);
  mergeUnlocked(s, null);
  assert.equal(s.unlocked.size, 2);
  mergeUnlocked(s, ['a', 'c']);
  assert.equal(s.unlocked.size, 3);
});

test('resolveResearchCost: explicit field wins; falls back on tier; defaults to 1', () => {
  assert.equal(resolveResearchCost({ research_cost_encounters: 4, tier: 2 }), 4);
  assert.equal(resolveResearchCost({ tier: 3 }), 3);
  assert.equal(resolveResearchCost({ tier: 1 }), 1);
  assert.equal(resolveResearchCost({}), 1);
  assert.equal(resolveResearchCost(null), 1);
  // Negative / zero explicit cost → fall back on tier default (1)
  assert.equal(resolveResearchCost({ research_cost_encounters: 0, tier: 2 }), 2);
});

test('startResearch: unknown thought → thought_not_found', () => {
  const s = createCabinetState();
  assert.deepEqual(startResearch(s, 'bogus_id'), { ok: false, error: 'thought_not_found' });
});

test('startResearch: not_unlocked if thought never passed MBTI threshold', () => {
  const s = createCabinetState();
  assert.deepEqual(startResearch(s, 'e_voce_collettiva'), {
    ok: false,
    error: 'not_unlocked',
  });
});

test('startResearch: happy path consumes a slot + sets timer', () => {
  const s = createCabinetState();
  mergeUnlocked(s, ['e_voce_collettiva']);
  const out = startResearch(s, 'e_voce_collettiva', { encounter: 5 });
  assert.equal(out.ok, true);
  assert.equal(out.cost_total, 1);
  assert.equal(s.researching.size, 1);
  assert.equal(slotsUsed(s), 1);
  const entry = s.researching.get('e_voce_collettiva');
  assert.equal(entry.cost_remaining, 1);
  assert.equal(entry.cost_total, 1);
  assert.equal(entry.started_at_encounter, 5);
});

test('startResearch: already_researching blocks double-start', () => {
  const s = createCabinetState();
  mergeUnlocked(s, ['i_osservatore']);
  startResearch(s, 'i_osservatore');
  assert.deepEqual(startResearch(s, 'i_osservatore'), {
    ok: false,
    error: 'already_researching',
  });
});

test('startResearch: already_internalized blocks re-research', () => {
  const s = createCabinetState();
  mergeUnlocked(s, ['i_osservatore']);
  s.internalized.add('i_osservatore');
  assert.deepEqual(startResearch(s, 'i_osservatore'), {
    ok: false,
    error: 'already_internalized',
  });
});

test('startResearch: no_free_slot when slots full', () => {
  const s = createCabinetState({ slotsMax: 1 });
  mergeUnlocked(s, ['e_voce_collettiva', 'i_osservatore']);
  startResearch(s, 'e_voce_collettiva');
  assert.deepEqual(startResearch(s, 'i_osservatore'), {
    ok: false,
    error: 'no_free_slot',
  });
});

test('tickResearch: decrements cost_remaining per call', () => {
  resetCache();
  const s = createCabinetState();
  mergeUnlocked(s, ['n_pioniere_possibile']); // tier 2 → cost 2 (default)
  startResearch(s, 'n_pioniere_possibile');
  assert.equal(s.researching.get('n_pioniere_possibile').cost_remaining, 2);
  tickResearch(s);
  assert.equal(s.researching.get('n_pioniere_possibile').cost_remaining, 1);
  assert.equal(s.internalized.size, 0);
  const { promoted } = tickResearch(s);
  assert.deepEqual(promoted, ['n_pioniere_possibile']);
  assert.equal(s.researching.size, 0);
  assert.ok(s.internalized.has('n_pioniere_possibile'));
});

test('tickResearch: delta > 1 skips rounds', () => {
  const s = createCabinetState();
  mergeUnlocked(s, ['n_visionario']); // tier 3 → cost 3
  startResearch(s, 'n_visionario');
  const { promoted } = tickResearch(s, 3);
  assert.deepEqual(promoted, ['n_visionario']);
});

test('tickResearch: non-finite delta treated as 1', () => {
  const s = createCabinetState();
  mergeUnlocked(s, ['e_voce_collettiva']);
  startResearch(s, 'e_voce_collettiva');
  tickResearch(s, 'not-a-number');
  assert.ok(s.internalized.has('e_voce_collettiva'));
});

test('tickResearch: multiple thoughts progress independently', () => {
  const s = createCabinetState();
  mergeUnlocked(s, ['e_voce_collettiva', 'n_pioniere_possibile']);
  startResearch(s, 'e_voce_collettiva'); // cost 1
  startResearch(s, 'n_pioniere_possibile'); // cost 2
  const first = tickResearch(s);
  assert.deepEqual(first.promoted, ['e_voce_collettiva']); // hit 0
  assert.equal(s.researching.get('n_pioniere_possibile').cost_remaining, 1);
  const second = tickResearch(s);
  assert.deepEqual(second.promoted, ['n_pioniere_possibile']);
});

test('forgetThought: removes from internalized + frees slot', () => {
  const s = createCabinetState();
  mergeUnlocked(s, ['e_voce_collettiva']);
  s.internalized.add('e_voce_collettiva');
  assert.equal(slotsUsed(s), 1);
  const out = forgetThought(s, 'e_voce_collettiva');
  assert.deepEqual(out.ok ? { ok: out.ok, freed_from: out.freed_from } : out, {
    ok: true,
    freed_from: 'internalized',
  });
  assert.equal(slotsUsed(s), 0);
});

test('forgetThought: removes from researching + returns freed_from=researching', () => {
  const s = createCabinetState();
  mergeUnlocked(s, ['i_osservatore']);
  startResearch(s, 'i_osservatore');
  const out = forgetThought(s, 'i_osservatore');
  assert.equal(out.ok, true);
  assert.equal(out.freed_from, 'researching');
  assert.equal(slotsUsed(s), 0);
});

test('forgetThought: not_active if thought neither researching nor internalized', () => {
  const s = createCabinetState();
  mergeUnlocked(s, ['e_voce_collettiva']);
  assert.deepEqual(forgetThought(s, 'e_voce_collettiva'), { ok: false, error: 'not_active' });
});

test('passiveBonuses: empty cabinet → empty deltas', () => {
  const s = createCabinetState();
  const out = passiveBonuses(s);
  assert.deepEqual(out.bonus, {});
  assert.deepEqual(out.cost, {});
  assert.deepEqual(out.internalized, []);
});

test('passiveBonuses: aggregates bonus + cost across internalized thoughts', () => {
  resetCache();
  const s = createCabinetState();
  // e_voce_collettiva: +attack_mod 1 / cost defense_dc 1
  // i_osservatore: +attack_range 1 / cost ap 1
  // Both tier 1 with defined effects in YAML.
  mergeUnlocked(s, ['e_voce_collettiva', 'i_osservatore']);
  s.internalized.add('e_voce_collettiva');
  s.internalized.add('i_osservatore');
  const out = passiveBonuses(s);
  assert.equal(out.bonus.attack_mod, 1);
  assert.equal(out.bonus.attack_range, 1);
  assert.equal(out.cost.defense_dc, 1);
  assert.equal(out.cost.ap, 1);
  assert.equal(out.internalized.length, 2);
});

test('passiveBonuses: stacks when the same stat appears in multiple thoughts', () => {
  resetCache();
  const s = createCabinetState();
  // p_adattatore bonus ap 1 + j_disciplina bonus attack_mod 1.
  // e_voce_collettiva bonus attack_mod 1 → stacks with j_disciplina.
  mergeUnlocked(s, ['e_voce_collettiva', 'j_disciplina']);
  s.internalized.add('e_voce_collettiva');
  s.internalized.add('j_disciplina');
  const out = passiveBonuses(s);
  assert.equal(out.bonus.attack_mod, 2);
});

test('passiveBonuses: tier-2 thought contributes effect_bonus/cost when internalized', () => {
  resetCache();
  const s = createCabinetState();
  // e_scintilla_carisma tier 2: attack_mod +2 / cost defense_dc 2
  mergeUnlocked(s, ['e_scintilla_carisma']);
  s.internalized.add('e_scintilla_carisma');
  const out = passiveBonuses(s);
  assert.equal(out.bonus.attack_mod, 2);
  assert.equal(out.cost.defense_dc, 2);
  assert.deepEqual(out.internalized, ['e_scintilla_carisma']);
});

test('passiveBonuses: tier-3 J thoughts stack attack_mod across tiers', () => {
  resetCache();
  const s = createCabinetState();
  // j_disciplina tier 1: attack_mod +1 / cost ap 1
  // j_maestro_ordine tier 3: attack_mod +3 / cost ap 2
  mergeUnlocked(s, ['j_disciplina', 'j_maestro_ordine']);
  s.internalized.add('j_disciplina');
  s.internalized.add('j_maestro_ordine');
  const out = passiveBonuses(s);
  assert.equal(out.bonus.attack_mod, 4); // 1 + 3 stacked
  assert.equal(out.cost.ap, 3); // 1 + 2 stacked
});

test('resolveResearchCost: explicit field on tier-2/3 thoughts returns correct cost', () => {
  resetCache();
  const catalog = loadThoughts();
  // Tier-2 explicit research_cost_encounters: 2
  assert.equal(resolveResearchCost(catalog.thoughts['e_scintilla_carisma']), 2);
  assert.equal(resolveResearchCost(catalog.thoughts['j_architetto_round']), 2);
  assert.equal(resolveResearchCost(catalog.thoughts['s_metodologia_ferro']), 2);
  // Tier-3 explicit research_cost_encounters: 3
  assert.equal(resolveResearchCost(catalog.thoughts['i_lupo_solitario']), 3);
  assert.equal(resolveResearchCost(catalog.thoughts['n_visionario']), 3);
  assert.equal(resolveResearchCost(catalog.thoughts['j_maestro_ordine']), 3);
});

test('snapshotCabinet: returns serialisable shape with slots stats', () => {
  const s = createCabinetState({ slotsMax: 2 });
  mergeUnlocked(s, ['e_voce_collettiva', 'i_osservatore']);
  startResearch(s, 'e_voce_collettiva');
  s.internalized.add('i_osservatore');
  const snap = snapshotCabinet(s);
  assert.deepEqual(Object.keys(snap).sort(), [
    'internalized',
    'researching',
    'slots_max',
    'slots_used',
    'unlocked',
  ]);
  assert.equal(snap.slots_max, 2);
  assert.equal(snap.slots_used, 2);
  assert.equal(snap.researching.length, 1);
  assert.equal(snap.researching[0].id, 'e_voce_collettiva');
  assert.equal(snap.researching[0].cost_remaining, 1);
  assert.deepEqual(snap.internalized, ['i_osservatore']);
});

test('full lifecycle: unlock → research → tick → internalize → forget → slot freed', () => {
  resetCache();
  const s = createCabinetState({ slotsMax: 1 });
  mergeUnlocked(s, ['e_voce_collettiva']);
  const r1 = startResearch(s, 'e_voce_collettiva');
  assert.equal(r1.ok, true);
  const t1 = tickResearch(s);
  assert.deepEqual(t1.promoted, ['e_voce_collettiva']);
  assert.equal(canResearchMore(s), false); // 1 slot, internalized
  const f1 = forgetThought(s, 'e_voce_collettiva');
  assert.equal(f1.ok, true);
  assert.equal(f1.freed_from, 'internalized');
  assert.equal(canResearchMore(s), true);
});

// ─────────────────────────────────────────────────────────
// Skiv ticket #4 — biome resonance reduces research_cost
// ─────────────────────────────────────────────────────────

test('startResearch: resonance=true reduces tier-2 cost from 2 to 1', () => {
  resetCache();
  const s = createCabinetState();
  mergeUnlocked(s, ['n_pioniere_possibile']); // tier 2 → cost 2
  const out = startResearch(s, 'n_pioniere_possibile', { resonance: true });
  assert.equal(out.ok, true);
  assert.equal(out.cost_total, 1);
  assert.equal(out.base_cost, 2);
  assert.equal(out.resonance_applied, true);
});

test('startResearch: resonance=true on tier-1 (cost 1) does NOT clamp below 1', () => {
  resetCache();
  const s = createCabinetState();
  mergeUnlocked(s, ['e_voce_collettiva']); // tier 1 → cost 1
  const out = startResearch(s, 'e_voce_collettiva', { resonance: true });
  assert.equal(out.ok, true);
  assert.equal(out.cost_total, 1, 'min 1 enforced');
  assert.equal(out.base_cost, 1);
  assert.equal(out.resonance_applied, false, 'no reduction reported when no actual saving');
});

test('startResearch: resonance=false (default) leaves cost untouched', () => {
  resetCache();
  const s = createCabinetState();
  mergeUnlocked(s, ['n_visionario']); // tier 3 → cost 3
  const out = startResearch(s, 'n_visionario');
  assert.equal(out.ok, true);
  assert.equal(out.cost_total, 3);
  assert.equal(out.base_cost, 3);
  assert.equal(out.resonance_applied, false);
});

test('startResearch: resonance reduces tier-3 cost from 3 to 2', () => {
  resetCache();
  const s = createCabinetState();
  mergeUnlocked(s, ['n_visionario']);
  const out = startResearch(s, 'n_visionario', { resonance: true });
  assert.equal(out.cost_total, 2);
  assert.equal(out.base_cost, 3);
  assert.equal(out.resonance_applied, true);
});

test('snapshotCabinet: exposes resonance_applied + base_cost on researching entries', () => {
  resetCache();
  const s = createCabinetState();
  mergeUnlocked(s, ['n_pioniere_possibile']);
  startResearch(s, 'n_pioniere_possibile', { resonance: true });
  const snap = snapshotCabinet(s);
  assert.equal(snap.researching.length, 1);
  assert.equal(snap.researching[0].cost_total, 1);
  assert.equal(snap.researching[0].base_cost, 2);
  assert.equal(snap.researching[0].resonance_applied, true);
});

// ─────────────────────────────────────────────────────────
// Sprint 6 (P4 Disco Tier S #9) — round-based cooldown mode
// ─────────────────────────────────────────────────────────

test('RESEARCH_ROUND_MULTIPLIER: exported as 3 (Sprint 6 default scaling)', () => {
  assert.equal(RESEARCH_ROUND_MULTIPLIER, 3);
});

test('startResearch mode=rounds: tier-1 cost 1 → 3 rounds', () => {
  resetCache();
  const s = createCabinetState();
  mergeUnlocked(s, ['e_voce_collettiva']); // tier 1 → base 1
  const out = startResearch(s, 'e_voce_collettiva', { mode: 'rounds' });
  assert.equal(out.ok, true);
  assert.equal(out.cost_total, 3);
  assert.equal(out.base_cost, 1);
  assert.equal(out.scaled_cost, 3);
  assert.equal(out.mode, 'rounds');
  assert.equal(out.resonance_applied, false);
});

test('startResearch mode=rounds: tier-2 cost 2 → 6 rounds', () => {
  resetCache();
  const s = createCabinetState();
  mergeUnlocked(s, ['e_scintilla_carisma']); // tier 2 → base 2
  const out = startResearch(s, 'e_scintilla_carisma', { mode: 'rounds' });
  assert.equal(out.cost_total, 6);
  assert.equal(out.scaled_cost, 6);
  assert.equal(out.mode, 'rounds');
});

test('startResearch mode=rounds: tier-3 cost 3 → 9 rounds', () => {
  resetCache();
  const s = createCabinetState();
  mergeUnlocked(s, ['n_visionario']); // tier 3 → base 3
  const out = startResearch(s, 'n_visionario', { mode: 'rounds' });
  assert.equal(out.cost_total, 9);
  assert.equal(out.scaled_cost, 9);
});

test('startResearch mode=rounds + resonance: -1 from scaled cost (T2 6→5)', () => {
  resetCache();
  const s = createCabinetState();
  mergeUnlocked(s, ['n_pioniere_possibile']); // tier 2 → base 2 → scaled 6
  const out = startResearch(s, 'n_pioniere_possibile', { mode: 'rounds', resonance: true });
  assert.equal(out.cost_total, 5);
  assert.equal(out.scaled_cost, 6);
  assert.equal(out.base_cost, 2);
  assert.equal(out.resonance_applied, true);
});

test('startResearch mode=encounters (default): preserves legacy cost behavior', () => {
  resetCache();
  const s = createCabinetState();
  mergeUnlocked(s, ['e_scintilla_carisma']);
  const out = startResearch(s, 'e_scintilla_carisma'); // no mode → encounters
  assert.equal(out.cost_total, 2);
  assert.equal(out.mode, 'encounters');
});

test('startResearch: round/encounter starting markers persisted on entry', () => {
  resetCache();
  const s = createCabinetState();
  mergeUnlocked(s, ['e_voce_collettiva']);
  startResearch(s, 'e_voce_collettiva', { mode: 'rounds', round: 7 });
  const entry = s.researching.get('e_voce_collettiva');
  assert.equal(entry.started_at_round, 7);
  assert.equal(entry.started_at_encounter, null);
  assert.equal(entry.mode, 'rounds');
});

test('tickResearch: round-mode T1 (3 rounds) progresses then internalizes on round 3', () => {
  resetCache();
  const s = createCabinetState();
  mergeUnlocked(s, ['e_voce_collettiva']);
  startResearch(s, 'e_voce_collettiva', { mode: 'rounds' });
  // After round 1: 2 left
  let res = tickResearch(s);
  assert.equal(res.promoted.length, 0);
  assert.equal(s.researching.get('e_voce_collettiva').cost_remaining, 2);
  // After round 2: 1 left
  res = tickResearch(s);
  assert.equal(res.promoted.length, 0);
  assert.equal(s.researching.get('e_voce_collettiva').cost_remaining, 1);
  // After round 3: promoted
  res = tickResearch(s);
  assert.deepEqual(res.promoted, ['e_voce_collettiva']);
  assert.equal(s.researching.size, 0);
  assert.ok(s.internalized.has('e_voce_collettiva'));
});

test('tickAllResearch: bulk decrements every cabinet in bucket + returns promotions', () => {
  resetCache();
  const bucket = new Map();
  // Two units, two thoughts in research with different costs.
  const s1 = createCabinetState();
  mergeUnlocked(s1, ['e_voce_collettiva']);
  startResearch(s1, 'e_voce_collettiva'); // encounters, cost 1
  bucket.set('unit-A', s1);
  const s2 = createCabinetState();
  mergeUnlocked(s2, ['n_pioniere_possibile']);
  startResearch(s2, 'n_pioniere_possibile'); // encounters, cost 2
  bucket.set('unit-B', s2);
  // First tick: only s1 promotes (cost 1 → 0).
  const round1 = tickAllResearch(bucket);
  assert.equal(round1.length, 1);
  assert.equal(round1[0].unit_id, 'unit-A');
  assert.deepEqual(round1[0].promoted, ['e_voce_collettiva']);
  // Second tick: s2 promotes.
  const round2 = tickAllResearch(bucket);
  assert.equal(round2.length, 1);
  assert.equal(round2[0].unit_id, 'unit-B');
  assert.deepEqual(round2[0].promoted, ['n_pioniere_possibile']);
});

test('tickAllResearch: empty bucket / null input → []', () => {
  assert.deepEqual(tickAllResearch(null), []);
  assert.deepEqual(tickAllResearch(undefined), []);
  assert.deepEqual(tickAllResearch(new Map()), []);
});

test('tickAllResearch: unit with empty researching is skipped (no entry in result)', () => {
  resetCache();
  const bucket = new Map();
  const s = createCabinetState();
  // Unlocked but not researching.
  mergeUnlocked(s, ['e_voce_collettiva']);
  bucket.set('unit-A', s);
  const result = tickAllResearch(bucket);
  assert.deepEqual(result, []);
});

test('snapshotCabinet round-mode: exposes mode + scaled_cost + progress_pct + started_at_round', () => {
  resetCache();
  const s = createCabinetState();
  mergeUnlocked(s, ['e_scintilla_carisma']); // T2 → base 2 → scaled 6
  startResearch(s, 'e_scintilla_carisma', { mode: 'rounds', round: 3 });
  // Tick twice → 4 remaining, 2/6 done = 33%
  tickResearch(s);
  tickResearch(s);
  const snap = snapshotCabinet(s);
  assert.equal(snap.researching.length, 1);
  const entry = snap.researching[0];
  assert.equal(entry.mode, 'rounds');
  assert.equal(entry.cost_total, 6);
  assert.equal(entry.scaled_cost, 6);
  assert.equal(entry.cost_remaining, 4);
  assert.equal(entry.base_cost, 2);
  assert.equal(entry.started_at_round, 3);
  assert.equal(entry.progress_pct, 33);
});

test('round-mode 8 slot cap: can fill 8 then 9th rejected with no_free_slot', () => {
  resetCache();
  const s = createCabinetState(); // default 8 slots
  // Need 8 unlocked thoughts to research.
  const ids = [
    'e_voce_collettiva',
    'i_osservatore',
    'n_intuizione_terrena',
    's_occhio_pratico',
    'p_adattatore',
    'j_disciplina',
    'e_scintilla_carisma',
    'i_calcolo_silente',
  ];
  mergeUnlocked(s, [...ids, 'n_pioniere_possibile']);
  for (const id of ids) {
    const r = startResearch(s, id, { mode: 'rounds' });
    assert.equal(r.ok, true, `slot for ${id} should be acquired`);
  }
  assert.equal(slotsUsed(s), 8);
  assert.equal(canResearchMore(s), false);
  const overflow = startResearch(s, 'n_pioniere_possibile', { mode: 'rounds' });
  assert.deepEqual(overflow, { ok: false, error: 'no_free_slot' });
});
