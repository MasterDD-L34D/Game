// Session engine pure helpers — extracted from session.js for token optimization.
// All functions here are pure (no closure deps, no I/O, no session Map access).
// They depend only on constants from sessionConstants.js.

'use strict';

const {
  GRID_SIZE,
  DEFAULT_HP,
  DEFAULT_AP,
  DEFAULT_MOD,
  DEFAULT_DC,
  DEFAULT_GUARDIA,
  DEFAULT_INITIATIVE,
  DEFAULT_FACING,
  VALID_FACINGS,
  JOB_INITIATIVE,
  JOB_STATS,
  JOB_ARCHETYPE,
} = require('./sessionConstants');

const { DEFAULT_ATTACK_RANGE } = require('../services/ai/policy');
const { buildAtlasLive } = require('../services/atlasLive');
const { applicableSynergies } = require('../services/combat/synergyDetector');

function rollD20(rng) {
  return Math.floor(rng() * 20) + 1;
}

function clampPosition(x, y) {
  return {
    x: Math.min(Math.max(0, Number(x) || 0), GRID_SIZE - 1),
    y: Math.min(Math.max(0, Number(y) || 0), GRID_SIZE - 1),
  };
}

function normaliseUnit(raw, fallbackIndex) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const id = String(input.id || `unit_${fallbackIndex + 1}`);
  const position =
    input.position && typeof input.position === 'object'
      ? clampPosition(input.position.x, input.position.y)
      : fallbackIndex === 0
        ? { x: 0, y: 0 }
        : { x: GRID_SIZE - 1, y: GRID_SIZE - 1 };
  const traits = Array.isArray(input.traits) ? input.traits.filter(Boolean).map(String) : [];
  const ap = Number.isFinite(Number(input.ap)) ? Number(input.ap) : DEFAULT_AP;
  const job = input.job ? String(input.job) : 'unknown';
  const jobStats = JOB_STATS[job] || {};
  const attackRange = Number.isFinite(Number(input.attack_range))
    ? Number(input.attack_range)
    : Number.isFinite(Number(jobStats.attack_range))
      ? Number(jobStats.attack_range)
      : DEFAULT_ATTACK_RANGE;
  const hp = Number.isFinite(Number(input.hp)) ? Number(input.hp) : DEFAULT_HP;
  const maxHp = Number.isFinite(Number(input.max_hp)) ? Number(input.max_hp) : hp;
  const status =
    input.status && typeof input.status === 'object'
      ? { ...input.status }
      : { panic: 0, rage: 0, stunned: 0, focused: 0, confused: 0, bleeding: 0, fracture: 0 };
  const initiative = Number.isFinite(Number(input.initiative))
    ? Number(input.initiative)
    : Number.isFinite(Number(JOB_INITIATIVE[job]))
      ? Number(JOB_INITIATIVE[job])
      : DEFAULT_INITIATIVE;
  const rawFacing = input.facing ? String(input.facing).toUpperCase() : null;
  const facing = VALID_FACINGS.has(rawFacing) ? rawFacing : fallbackIndex === 0 ? 'S' : 'N';
  // M14-C — preserve elevation integer (default 0 = ground). Triangle Strategy
  // Mechanic 3A multiplier in computePositionalDamage reads unit.elevation; if
  // stripped here the bonus never activates even when scenario spec sets it.
  const elevation = Number.isFinite(Number(input.elevation))
    ? Math.trunc(Number(input.elevation))
    : 0;
  // M6-Z: resistance_archetype derived from input o job mapping.
  // Priority: explicit input field > JOB_ARCHETYPE[job] > null (fallback default adattivo
  // applicato da resistanceEngine.getArchetypeResistances se absente).
  const resistanceArchetype = input.resistance_archetype
    ? String(input.resistance_archetype)
    : JOB_ARCHETYPE[job] || null;
  const unit = {
    id,
    species: input.species ? String(input.species) : 'unknown',
    job,
    traits,
    hp,
    max_hp: maxHp,
    status,
    ap,
    ap_remaining: Number.isFinite(Number(input.ap_remaining)) ? Number(input.ap_remaining) : ap,
    mod: Number.isFinite(Number(input.mod)) ? Number(input.mod) : DEFAULT_MOD,
    dc: Number.isFinite(Number(input.dc)) ? Number(input.dc) : DEFAULT_DC,
    guardia: Number.isFinite(Number(input.guardia)) ? Number(input.guardia) : DEFAULT_GUARDIA,
    attack_range: attackRange,
    initiative,
    facing,
    elevation,
    position,
    controlled_by: input.controlled_by ? String(input.controlled_by) : 'player',
    // M16 P0-1 — owner_id mapping player→unit per co-op Jackbox flow.
    // Set solo per unità player-controlled; enemy restano null.
    owner_id: input.owner_id ? String(input.owner_id) : null,
    name: input.name ? String(input.name) : null,
    form_id: input.form_id ? String(input.form_id) : null,
    resistance_archetype: resistanceArchetype,
    // V5 SG pool — preserve from input so save-load + tests carry value through.
    // sgTracker.initUnit will keep this if already set, otherwise default to 0.
    sg: Number.isFinite(Number(input.sg)) ? Number(input.sg) : 0,
    // Sprint Spore Moderate — preserve species_id (alias di species), applied_mutations,
    // mp pool, lineage_id. Necessari per:
    // - mutationEngine slot-conflict + bingo hydration (PR #1916)
    // - lineagePropagator inheritFromLineage / propagateLineage (PR Sprint Y)
    // Default null/empty cosi back-compat unit senza Spore data resta intatta.
    species_id: input.species_id
      ? String(input.species_id)
      : input.species
        ? String(input.species)
        : null,
    applied_mutations: Array.isArray(input.applied_mutations)
      ? input.applied_mutations.slice()
      : [],
    mp: Number.isFinite(Number(input.mp)) ? Number(input.mp) : 5,
    lineage_id: input.lineage_id ? String(input.lineage_id) : null,
    abilities: Array.isArray(input.abilities) ? input.abilities.slice() : [],
    // ADR-2026-04-17 Q-001 T3.1: preserve ai_profile per Utility AI gradual rollout.
    // Senza questo campo, declareSistemaIntents.resolveUseUtilityBrain() cade su
    // useUtilityAi global (default false) → Utility AI mai attivo per /start sessions.
    // Bot-flagged 2026-04-29 PR #1495 review.
    ai_profile: input.ai_profile ? String(input.ai_profile) : null,
  };
  // 2026-05-06 TKT-P3-FORM-STAT-APPLIER — apply form stat_seed delta to
  // baseline. Pre-fix: form_id was cosmetic only — NO mech link to combat.
  // Now: form_id (e.g. INTJ) shifts hp/ap/mod/guardia per stat_seed YAML
  // mapping (16 form × 4 stat). Idempotent via _form_stat_applied flag.
  // Best-effort: missing helper non blocca normalize.
  //
  // 2026-05-10 TKT-MBTI-AFFINITY-RUNTIME — chain applyJobAffinityBonus
  // post-stat_seed. form × job match → first-turn ±1 attack_mod +
  // ±1 defense_mod (mirror soft_gate.first_turn_penalty schema). Decay
  // automatico via existing end-of-round loop. Idempotent.
  try {
    // eslint-disable-next-line global-require
    const { applyStatSeed, applyJobAffinityBonus } = require('../services/forms/formStatApplier');
    let result = applyStatSeed(unit);
    result = applyJobAffinityBonus(result);
    return result;
  } catch {
    return unit;
  }
}

function buildDefaultUnits() {
  return [
    normaliseUnit(
      {
        id: 'unit_1',
        species: 'velox',
        job: 'skirmisher',
        traits: ['zampe_a_molla'],
        position: { x: 0, y: 0 },
        controlled_by: 'player',
      },
      0,
    ),
    normaliseUnit(
      {
        id: 'unit_2',
        species: 'carapax',
        job: 'vanguard',
        traits: ['pelle_elastomera'],
        position: { x: 5, y: 5 },
        controlled_by: 'sistema',
      },
      1,
    ),
  ];
}

function normaliseUnitsPayload(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return buildDefaultUnits();
  }
  return raw.map((entry, index) => normaliseUnit(entry, index));
}

function resolveAttack({ actor, target, rng }) {
  const die = rollD20(rng);
  // Ability buff bonus temporanei (es. evasive_maneuver defense_mod +1,
  // dash_strike attack_mod +1). Dormono come actor[stat]_bonus finche'
  // status[stat]_buff > 0 (decadimento in sessionRoundBridge.clearExpiredBonuses).
  // Sprint α (Phoenix Point pattern): pseudo-RNG miss-streak bonus.
  // Lazy require evita cycle, back-compat zero-delta se actor senza fields.
  let pseudoRngBonus = 0;
  let pseudoRngMod = null;
  try {
    pseudoRngMod = require('../services/combat/pseudoRng');
    pseudoRngBonus = pseudoRngMod.getStreakBonus(actor);
  } catch {
    pseudoRngBonus = 0;
  }
  // Sprint α (XCOM 2 pattern): pin down attack penalty consumer.
  let pinPenalty = 0;
  try {
    const { getPinPenalty } = require('../services/combat/pinDown');
    pinPenalty = getPinPenalty(actor);
  } catch {
    pinPenalty = 0;
  }
  const attackMod =
    Number(actor.mod || 0) + Number(actor.attack_mod_bonus || 0) + pseudoRngBonus - pinPenalty;
  const roll = die + attackMod;
  const baseDc = target.dc ?? target.dc_difesa ?? 10 + (target.mod || 0);
  // Ennea Cacciatore(8) evasion_bonus consumer: alza DC del target. Stesso slot
  // semantico di defense_mod_bonus ma stat distinto (decay separato + telemetria).
  const dc =
    Number(baseDc) +
    Number(target.defense_mod_bonus || 0) +
    Number(target.evasion_bonus_bonus || 0);
  const mos = roll - dc;
  const hit = mos >= 0;
  let pt = 0;
  if (hit) {
    if (die >= 15 && die <= 19) pt += 1;
    if (die === 20) pt += 2;
    pt += Math.floor(mos / 5);
  }
  // Sprint α: record pseudo-RNG outcome (miss/hit streak update).
  if (pseudoRngMod && typeof pseudoRngMod.recordRoll === 'function') {
    try {
      pseudoRngMod.recordRoll(actor, hit);
    } catch {
      /* non-blocking */
    }
  }
  return { die, roll, mos, hit, dc, pt, pseudo_rng_bonus: pseudoRngBonus, pin_penalty: pinPenalty };
}

/**
 * Predizione combattimento (Halfway lesson: decision surfacing).
 * Simula N attacchi con la stessa formula di resolveAttack e ritorna
 * distribuzione statistica per il client.
 *
 * M14-A residuo (TKT-09 2026-04-26): ora include `elevation_multiplier` e
 * `expected_damage` derivati dall'elevation delta tra actor e target. Il
 * baseline damage = 1 + avg_pt (mirror resolveAttack damage step). Mantiene
 * backward-compat: signature invariata, campi nuovi additivi.
 *
 * @param {{ mod?: number, elevation?: number }} actor
 * @param {{ dc?: number, dc_difesa?: number, mod?: number, elevation?: number }} target
 * @param {number} [n=1000] — simulazioni (analytic over 20 faces, n ignored)
 * @returns {{ simulations, hit_pct, crit_pct, fumble_pct, avg_mos, dc, attack_mod, avg_pt, elevation_multiplier, elevation_delta, expected_damage }}
 */
function predictCombat(actor, target, n = 1000) {
  const attackMod = Number(actor.mod || 0) + Number(actor.attack_mod_bonus || 0);
  const baseDc = target.dc ?? target.dc_difesa ?? 10 + (target.mod || 0);
  // Mirror resolveAttack: evasion_bonus_bonus alza DC effettiva.
  const dc =
    Number(baseDc) +
    Number(target.defense_mod_bonus || 0) +
    Number(target.evasion_bonus_bonus || 0);

  let hits = 0;
  let crits = 0;
  let fumbles = 0;
  let totalMos = 0;
  let totalPt = 0;

  // Analytic simulation over all 20 d20 faces, weighted equally
  // (faster and more accurate than random sampling for d20)
  for (let die = 1; die <= 20; die++) {
    const roll = die + attackMod;
    const mos = roll - dc;
    const hit = mos >= 0;

    if (hit) {
      hits++;
      let pt = 0;
      if (die >= 15 && die <= 19) pt += 1;
      if (die === 20) pt += 2;
      pt += Math.floor(mos / 5);
      totalPt += pt;
      totalMos += mos;
    }
    if (die === 20) crits++;
    if (die === 1) fumbles++;
  }

  const total = 20; // exact enumeration over d20
  const hitPct = (hits / total) * 100;
  const avgPt = hits > 0 ? totalPt / hits : 0;
  // M14-A residuo: elevation multiplier — match computePositionalDamage default
  // coeffs (bonus 0.30, penalty -0.15). Ignora flank (richiede facing —
  // non disponibile in predict pure stat call) + adjacency/rage/backstab
  // (richiedono runtime state). Halfway lesson: surface FIRST-ORDER signal.
  let elevationMul = 1;
  let elevationDelta = 0;
  try {
    const aElev = Number.isFinite(Number(actor?.elevation)) ? Number(actor.elevation) : 0;
    const tElev = Number.isFinite(Number(target?.elevation)) ? Number(target.elevation) : 0;
    elevationDelta = aElev - tElev;
    if (elevationDelta >= 1) elevationMul = 1.3;
    else if (elevationDelta <= -1) elevationMul = 0.85;
    elevationMul = Math.max(0.1, elevationMul);
  } catch {
    elevationMul = 1;
    elevationDelta = 0;
  }
  // expected_damage proxy: hit_pct * (1 + avg_pt) * elevation_multiplier.
  const baseDmgPerHit = 1 + avgPt;
  const expectedDamage = (hitPct / 100) * baseDmgPerHit * elevationMul;

  return {
    simulations: total,
    hit_pct: Math.round(hitPct * 10) / 10,
    crit_pct: Math.round((crits / total) * 1000) / 10,
    fumble_pct: Math.round((fumbles / total) * 1000) / 10,
    avg_mos: hits > 0 ? Math.round((totalMos / hits) * 10) / 10 : 0,
    avg_pt: hits > 0 ? Math.round(avgPt * 10) / 10 : 0,
    dc,
    attack_mod: attackMod,
    elevation_multiplier: elevationMul,
    elevation_delta: elevationDelta,
    expected_damage: Math.round(expectedDamage * 100) / 100,
  };
}

function timestampStamp(date) {
  const iso = date.toISOString();
  return iso
    .replace(/[-:]/g, '')
    .replace(/\..*Z$/, '')
    .replace('T', '_');
}

// OD-001 Path A Sprint A — Nido unlock gating helper.
//
// Checks whether the Nido hub should be exposed to clients (and visible in the
// HUD header). Sblocco diegetic via narrative arc:
//   - `state.meta.nido_unlocked === true` (set by narrative engine, Wave 9+)
//   - OR `state.meta.biome_arc_completed === true` AND
//        `state.meta.missions_in_biome_count >= 3`
//   - OR env override `NIDO_UNLOCKED=true` (dev/test bypass)
//
// Returns boolean. Pure (no side effects).
//
// NOTE: Sprint A non wire ancora trigger reale al narrative engine. Il check
// supporta sia dev-mode (env flag) che signal narrative future.
function checkNidoUnlock(session) {
  if (process.env.NIDO_UNLOCKED === 'true') return true;
  const meta = (session && session.meta) || {};
  if (meta.nido_unlocked === true) return true;
  const biomeArcDone = meta.biome_arc_completed === true;
  const missionsCount = Number(meta.missions_in_biome_count) || 0;
  if (biomeArcDone && missionsCount >= 3) return true;
  return false;
}

function publicSessionView(session) {
  // A2: expose PP/SG/surge_ready per unit for UI consumption.
  // V5 (ADR-2026-04-26): `sg` è ora pool integer 0..3 (Seed of Growth),
  // gestito da sgTracker. Il gauge legacy stress-based (0..100) è esposto
  // come `stress_gauge` + `surge_ready` per non collidere con V5 pool.
  const unitsWithGauges = (session.units || []).map((u) => {
    const stressGauge = Math.floor((u.stress || 0) * 100);
    return {
      ...u,
      pp: u.pp || 0,
      sg: Number.isFinite(Number(u.sg)) ? Number(u.sg) : 0,
      stress_gauge: stressGauge,
      surge_ready: stressGauge >= 75,
      pp_tier: (u.pp || 0) >= 10 ? 3 : (u.pp || 0) >= 6 ? 2 : (u.pp || 0) >= 3 ? 1 : 0,
    };
  });
  const pressure = Number.isFinite(Number(session.sistema_pressure))
    ? Number(session.sistema_pressure)
    : 0;
  const tier = computeSistemaTier(pressure);
  // Atlas live in-match telemetry (pressure player-side, momentum, warnings)
  const atlas = buildAtlasLive(session);
  return {
    session_id: session.session_id,
    turn: session.turn,
    active_unit: session.active_unit,
    turn_order: session.turn_order || [],
    turn_index: session.turn_index || 0,
    units: unitsWithGauges,
    grid: session.grid,
    grid_size: session.grid.width,
    log_events_count: session.events.length,
    // W5.C — expose last N events tail per frontend FX trigger robustness.
    // Wave 3 trovò root cause FX mancanti: processNewEvents legge newWorld.events
    // ma publicSessionView espose solo count. Wire frontend-side via
    // processIaActions(player+ia actions) copre commit-round flow, ma per legacy
    // /action flow + generic fallback serve events[] array.
    // Tail 30 limita payload (full log può essere lungo, multi-round).
    events: Array.isArray(session.events) ? session.events.slice(-30) : [],
    sistema_pressure: pressure,
    sistema_tier: tier,
    sistema_counter: Number(session.sistema_counter) || 0,
    // 2026-04-26 P0 quick-win — AI War Progress meter (Tier S donor).
    // Lazy require + try/catch: missing module non blocca state response.
    ai_progress: (() => {
      try {
        return require('../services/ai/aiProgressMeter').getProgressMeterState(session);
      } catch {
        return null;
      }
    })(),
    atlas,
    last_round_combos: Array.isArray(session.last_round_combos) ? session.last_round_combos : [],
    previous_round_combos: Array.isArray(session.previous_round_combos)
      ? session.previous_round_combos
      : [],
    last_round_synergies: Array.isArray(session.last_round_synergies)
      ? session.last_round_synergies
      : [],
    previous_round_synergies: Array.isArray(session.previous_round_synergies)
      ? session.previous_round_synergies
      : [],
    synergy_preview: buildSynergyPreview(session),
    // M14-A 2026-04-25 — Triangle Strategy terrain reactions tile state map.
    // Exposed read-only to clients for hex tinting / FX overlay. Mutated
    // server-side only (performAttack post damage + decay in turn_end).
    tile_state_map:
      session.tile_state_map && typeof session.tile_state_map === 'object'
        ? session.tile_state_map
        : {},
    // QW1 (M-018) — biome runtime knobs derivati da diff_base +
    // hazard.stress_modifiers. Read-only debug surface; future UI hook
    // (hostile-biome banner). Safe defaults se biome_id assente.
    biome_modifiers:
      session.biome_modifiers && typeof session.biome_modifiers === 'object'
        ? session.biome_modifiers
        : { diff_base: 1.0, hp_mult: 1.0, pressure_mult: 0, pressure_initial_bonus: 0 },
    // TKT-P6 — Rewind safety valve summary for HUD undo button. Always present
    // (default budget=3 even on fresh session, snapshots=0 until first action).
    rewind: (() => {
      try {
        // eslint-disable-next-line global-require
        const { rewindStateSummary } = require('../services/combat/rewindBuffer');
        return rewindStateSummary(session);
      } catch {
        return { budget_remaining: 3, budget_max: 3, snapshots_count: 0, buffer_size: 3 };
      }
    })(),
    // Sprint 11 (Surface-DEAD #6): expose biome_id per HUD biome chip surface.
    // session.biome_id viene popolato in /start dal body biome_id raw. Fallback
    // a session.encounter?.biome_id quando encounter_id YAML loader popola
    // encounter ma biome_id raw non passato (e.g. tutorial UI flow).
    // Null se nessun biome dichiarato (legacy tutorial / scenario JS senza biome).
    biome_id: session.biome_id || session.encounter?.biome_id || null,
    // OD-001 Path A Sprint A — Nido unlock flag for HUD btn visibility.
    nido_unlocked: checkNidoUnlock(session),
    // Skiv Goal 2 (2026-04-28) — Echolocation sense surface. Lazy compute:
    // for every actor with `default_parts.senses` containing 'echolocation',
    // expose an empty placeholder bag the frontend pulse helper can fill on
    // hover. Map shape: { actor_id: { has_echolocation: true, radius } }.
    // No tile coords here (those are computed render-side from hovered
    // target). Additive field — never breaks legacy clients.
    tile_visibility: (() => {
      try {
        const { BASE_RADIUS, BONUS_TRAIT_ID } = require('../services/combat/senseReveal');
        const out = {};
        for (const u of session.units || []) {
          if (!u || !u.id) continue;
          const senses = u.default_parts && u.default_parts.senses;
          if (!Array.isArray(senses)) continue;
          if (!senses.some((s) => typeof s === 'string' && s.toLowerCase() === 'echolocation')) {
            continue;
          }
          const traitIds = Array.isArray(u.trait_ids) ? u.trait_ids : u.traits;
          const hasBonus = Array.isArray(traitIds) && traitIds.some((t) => t === BONUS_TRAIT_ID);
          out[u.id] = { has_echolocation: true, radius: BASE_RADIUS + (hasBonus ? 1 : 0) };
        }
        return out;
      } catch {
        return {};
      }
    })(),
  };
}

function buildSynergyPreview(session) {
  const turn = Number(session.turn || 0);
  const lastFires = session._synergy_last_fire || {};
  return (session.units || [])
    .filter((u) => u && u.hp > 0)
    .map((u) => {
      const synergies = applicableSynergies(u);
      if (synergies.length === 0) return null;
      const onCooldown = lastFires[u.id] !== undefined && lastFires[u.id] === turn;
      return {
        unit_id: u.id,
        synergies: synergies.map((s) => ({
          id: s.id,
          name: s.name,
          bonus_damage: s.effect?.bonus_damage ?? 1,
        })),
        on_cooldown: onCooldown,
        ready: !onCooldown,
      };
    })
    .filter(Boolean);
}

function buildTurnOrder(units) {
  return units
    .map((u, idx) => ({ id: u.id, init: Number(u.initiative) || 0, idx }))
    .sort((a, b) => b.init - a.init || a.idx - b.idx)
    .map((e) => e.id);
}

function nextUnitId(session) {
  const order = session.turn_order;
  if (Array.isArray(order) && order.length > 0) {
    const n = order.length;
    let idx = Number.isFinite(session.turn_index) ? session.turn_index : -1;
    for (let i = 0; i < n; i += 1) {
      idx = (idx + 1) % n;
      const candidateId = order[idx];
      const unit = session.units.find((u) => u.id === candidateId);
      if (unit && unit.hp > 0) {
        session.turn_index = idx;
        return candidateId;
      }
    }
    return null;
  }
  const units = session.units;
  if (!units.length) return null;
  const currentIdx = units.findIndex((u) => u.id === session.active_unit);
  const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % units.length;
  return units[nextIdx].id;
}

function manhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function pickLowestHpEnemy(session, actor) {
  // Faction filter: un'unita' e' "enemy" solo se appartiene a una fazione
  // diversa (controlled_by). Senza questo filtro, il SIS attaccava le
  // proprie unita' (fratricidio osservato nel playtest 2026-04-17).
  //
  // NOTA design: il "friendly fire intenzionale" (fame, confusione,
  // istinto evolutivo — es. predatori che si mangiano tra loro sotto
  // soglia HP, unit in stato confused che bersagliano alleati) e' un
  // vettore di design futuro. Quando introdotto, passera' da qui via
  // override esplicito (status flag o rule-specific target picker),
  // non rimuovendo questo guardrail di base.
  const actorFaction = actor.controlled_by;
  const enemies = session.units.filter(
    (u) => u.id !== actor.id && u.hp > 0 && u.controlled_by !== actorFaction,
  );
  if (!enemies.length) return null;
  return enemies.reduce((lowest, candidate) => {
    if (!lowest) return candidate;
    return candidate.hp < lowest.hp ? candidate : lowest;
  }, null);
}

function stepTowards(from, to) {
  const next = { ...from };
  if (from.x !== to.x) {
    next.x += from.x < to.x ? 1 : -1;
  } else if (from.y !== to.y) {
    next.y += from.y < to.y ? 1 : -1;
  }
  return clampPosition(next.x, next.y);
}

function isBackstab(actor, target) {
  if (!actor?.position || !target?.position) return false;
  const f = target.facing || DEFAULT_FACING;
  const dx = actor.position.x - target.position.x;
  const dy = actor.position.y - target.position.y;
  if (f === 'N') return dy > 0;
  if (f === 'S') return dy < 0;
  if (f === 'E') return dx < 0;
  if (f === 'W') return dx > 0;
  return false;
}

/**
 * M14-B 2026-04-25 — classify attacker quadrant relative to target facing.
 * Extends isBackstab() with side-attack detection (flank).
 * Returns: 'rear' | 'flank' | 'front'.
 * Ref: docs/research/triangle-strategy-transfer-plan.md:186 (Mechanic 3C)
 */
function attackQuadrant(actor, target) {
  if (!actor?.position || !target?.position) return 'front';
  const f = target.facing || DEFAULT_FACING;
  const dx = actor.position.x - target.position.x;
  const dy = actor.position.y - target.position.y;
  // Rear matches isBackstab() exactly to preserve legacy backstab semantics.
  if (f === 'N' && dy > 0) return 'rear';
  if (f === 'S' && dy < 0) return 'rear';
  if (f === 'E' && dx < 0) return 'rear';
  if (f === 'W' && dx > 0) return 'rear';
  // Front: same side as facing.
  if (f === 'N' && dy < 0 && dx === 0) return 'front';
  if (f === 'S' && dy > 0 && dx === 0) return 'front';
  if (f === 'E' && dx > 0 && dy === 0) return 'front';
  if (f === 'W' && dx < 0 && dy === 0) return 'front';
  // Flank: anything orthogonal to facing (side) OR a diagonal that isn't rear/front.
  return 'flank';
}

/**
 * M14-B 2026-04-25 — Triangle Strategy positional damage multiplier.
 * Pure helper. Caller passes baseDamage + actor + target + opts; receives the
 * adjusted damage + breakdown for logging.
 *
 * Multipliers applied (multiplicatively, TS-style):
 *   elevation: delta >= 1 → +30% default (mirror penalty -15% when below)
 *   flank:     side attack → +15% damage (default)
 *   rear:      rear attack → +0% here; rear bonus remains in session.js as
 *              legacy +1 flat (do not double-apply). Caller opts in via
 *              rearMultiplier if desired.
 *
 * Cap: final multiplier clamped to [0.1, 2.0] to avoid stacking one-shots.
 *
 * Ref: docs/research/triangle-strategy-transfer-plan.md:229 (stacking risk)
 */
function computePositionalDamage({
  actor,
  target,
  baseDamage,
  elevationBonus = 0.3,
  elevationPenalty = -0.15,
  flankBonus = 0.15,
  rearMultiplier = 0, // default 0: legacy +1 rear bonus preserved elsewhere
} = {}) {
  const base = Number.isFinite(baseDamage) ? baseDamage : 0;
  if (base <= 0) {
    return { damage: 0, quadrant: 'front', elevation_delta: 0, multiplier: 1, parts: {} };
  }
  const quadrant = attackQuadrant(actor, target);
  const aElev = Number.isFinite(Number(actor?.elevation)) ? Number(actor.elevation) : 0;
  const tElev = Number.isFinite(Number(target?.elevation)) ? Number(target.elevation) : 0;
  const delta = aElev - tElev;

  let elevMul = 1;
  if (delta >= 1) elevMul = 1 + elevationBonus;
  else if (delta <= -1) elevMul = 1 + elevationPenalty;
  let flankMul = 1;
  if (quadrant === 'flank') flankMul = 1 + flankBonus;
  let rearMul = 1;
  if (quadrant === 'rear') rearMul = 1 + rearMultiplier;

  const total = Math.max(0.1, Math.min(2.0, elevMul * flankMul * rearMul));
  const damage = Math.max(0, Math.floor(base * total));
  return {
    damage,
    quadrant,
    elevation_delta: delta,
    multiplier: Math.round(total * 100) / 100,
    parts: {
      elevation: Math.round(elevMul * 100) / 100,
      flank: Math.round(flankMul * 100) / 100,
      rear: Math.round(rearMul * 100) / 100,
    },
  };
}

function facingFromMove(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? 'E' : 'W';
  }
  return dy > 0 ? 'S' : 'N';
}

// Sistema Pressure — AI War "AI Progress" pattern.
// Mappa pressure integer (0..100) → tier capabilities SIS.
// Tiers hardcoded qui come fallback; il sorgente autoritativo e'
// packs/evo_tactics_pack/data/balance/sistema_pressure.yaml (future wiring).
const SISTEMA_PRESSURE_TIERS = [
  { threshold: 0, label: 'Calm', intents_per_round: 1, reinforcement_budget: 0 },
  { threshold: 25, label: 'Alert', intents_per_round: 2, reinforcement_budget: 1 },
  { threshold: 50, label: 'Escalated', intents_per_round: 2, reinforcement_budget: 2 },
  { threshold: 75, label: 'Critical', intents_per_round: 3, reinforcement_budget: 3 },
  { threshold: 95, label: 'Apex', intents_per_round: 3, reinforcement_budget: 4 },
];

function computeSistemaTier(pressure) {
  const p = Number.isFinite(Number(pressure)) ? Math.max(0, Math.min(100, Number(pressure))) : 0;
  let tier = SISTEMA_PRESSURE_TIERS[0];
  for (const t of SISTEMA_PRESSURE_TIERS) {
    if (p >= t.threshold) tier = t;
  }
  return tier;
}

function applyPressureDelta(current, delta) {
  const base = Number.isFinite(Number(current)) ? Number(current) : 0;
  const d = Number.isFinite(Number(delta)) ? Number(delta) : 0;
  return Math.max(0, Math.min(100, base + d));
}

/**
 * Refill `unit.ap_remaining` honoring active modifiers:
 *   - fracture status: cap at 1 AP
 *   - defy_penalty (Skiv ticket #5): -1 AP for one turn after Defy use
 *
 * Mutates the unit. Single source of truth so future modifiers go here.
 */
function applyApRefill(unit) {
  if (!unit) return;
  const fractureActive = Number(unit.status?.fracture) > 0;
  let cap = Number(unit.ap || 0);
  if (fractureActive) cap = Math.min(1, cap);
  if (Number(unit.status?.defy_penalty) > 0) cap = Math.max(0, cap - 1);
  if (Number(unit.status?.chilled) > 0) cap = Math.max(1, cap - 1);
  if (Number(unit.status?.slowed) > 0) cap = Math.max(1, cap - 1);
  unit.ap_remaining = cap;
}

// Mirror dei delta events da sistema_pressure.yaml.
// Mantenuto qui per evitare YAML loader in hot path (round flow).
// Sync con packs/evo_tactics_pack/data/balance/sistema_pressure.yaml §deltas.
//
// NOTA DESIGN (balance-auditor 2026-04-19 review): la direzione corrente è:
// - pg_kills_sis +20 = AI escalates in risposta a threat player
// - sg_pg_down -10 = AI mercy quando team soffre
// - round_decay -1 = natural ease su stall
// Balance-auditor propone inversione: player killing → AI ease (reward), enemy
// killing → AI escalate (AI Progress meter). Entrambe valide design-wise.
// Test `postmortemWiring.test.js` encode la direzione corrente come contract.
// Inversione = design decision, non bug. Tracciato in M7 sprint pending ADR.
const PRESSURE_DELTAS = Object.freeze({
  pg_kills_sis: 20, // player KO sistema → pressure sale (engage)
  sg_pg_down: -10, // sistema KO player → pressure cala (Sistema si placa)
  pg_victory_encounter: 15,
  pg_trait_unlock: 5,
  pg_biome_clear: 20,
  round_decay: -1, // decay naturale per round senza eventi
});

module.exports = {
  rollD20,
  clampPosition,
  normaliseUnit,
  buildDefaultUnits,
  normaliseUnitsPayload,
  resolveAttack,
  timestampStamp,
  publicSessionView,
  applyApRefill,
  buildTurnOrder,
  nextUnitId,
  manhattanDistance,
  pickLowestHpEnemy,
  stepTowards,
  isBackstab,
  attackQuadrant,
  computePositionalDamage,
  facingFromMove,
  predictCombat,
  computeSistemaTier,
  applyPressureDelta,
  SISTEMA_PRESSURE_TIERS,
  PRESSURE_DELTAS,
  buildSynergyPreview,
  checkNidoUnlock,
};
