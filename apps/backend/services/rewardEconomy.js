// C1+C2+C3: Reward economy — PE/PI/Seed generation and conversion.
//
// PE = Progression Experience (earned per session from VC performance)
// PI = Build Investment (converted from PE at checkpoints, 5:1 ratio)
// Seed = Growth/breeding resource (from mating, harvester job, special events)
//
// Fonte: Final Design Freeze v0.9 §19

'use strict';

// PE generation base values per encounter difficulty (encounter_class compatible)
// Aliases mappano sia categorie legacy (tutorial/standard/elite/boss) sia encounter_class (tutorial_advanced/hardcore).
const PE_BASE_BY_DIFFICULTY = {
  tutorial: 3,
  tutorial_advanced: 4,
  standard: 5,
  elite: 8,
  hardcore: 10,
  boss: 12,
};

// VC performance bonus thresholds
const VC_BONUS_THRESHOLDS = [
  { min: 0.7, bonus: 3, label: 'eccellente' },
  { min: 0.5, bonus: 2, label: 'buono' },
  { min: 0.3, bonus: 1, label: 'sufficiente' },
];

// PE→PI conversion ratio (§19.2)
const PE_PER_PI = 5;

/**
 * C1: Calcola PE guadagnati da una sessione.
 *
 * @param {object} vcSnapshot — output di buildVcSnapshot()
 * @param {object} encounterData — { difficulty, biome_id, ... }
 * @returns {{ per_actor: Record<string, {pe_base, pe_bonus, pe_total, bonus_reason}>, session_total }}
 */
function computeSessionPE(vcSnapshot, encounterData = {}) {
  const difficulty = encounterData.difficulty || 'standard';
  const peBase = PE_BASE_BY_DIFFICULTY[difficulty] || PE_BASE_BY_DIFFICULTY.standard;
  const perActor = {};
  let sessionTotal = 0;

  for (const [unitId, actorVc] of Object.entries(vcSnapshot.per_actor || {})) {
    const indices = actorVc.aggregate_indices || {};
    // Average of non-null indices as overall performance score
    const values = Object.values(indices).filter((v) => v !== null && typeof v === 'number');
    const avgPerf = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

    let peBonus = 0;
    let bonusReason = 'nessun bonus';
    for (const threshold of VC_BONUS_THRESHOLDS) {
      if (avgPerf >= threshold.min) {
        peBonus = threshold.bonus;
        bonusReason = threshold.label;
        break;
      }
    }

    // Ennea trigger bonus: +1 PE per archetype triggered
    const enneaCount = (actorVc.ennea_archetypes || []).length;
    const enneaBonus = Math.min(enneaCount, 2); // max +2 from ennea

    const peTotal = peBase + peBonus + enneaBonus;
    perActor[unitId] = {
      pe_base: peBase,
      pe_vc_bonus: peBonus,
      pe_ennea_bonus: enneaBonus,
      pe_total: peTotal,
      vc_performance: Math.round(avgPerf * 100) / 100,
      bonus_reason: bonusReason,
    };
    sessionTotal += peTotal;
  }

  return { per_actor: perActor, session_total: sessionTotal };
}

/**
 * C2: Converte PE in PI con ratio 5:1.
 *
 * @param {number} peBalance — PE accumulati
 * @returns {{ pi_gained: number, pe_remaining: number }}
 */
function convertPE(peBalance) {
  const piGained = Math.floor(peBalance / PE_PER_PI);
  const peRemaining = peBalance % PE_PER_PI;
  return { pi_gained: piGained, pe_remaining: peRemaining };
}

/**
 * C3: Assembla debrief summary completo per fine sessione.
 *
 * @param {object} session — session state
 * @param {object} vcSnapshot — VC snapshot
 * @param {object} peResult — output di computeSessionPE()
 * @param {object} pfSession — output di computePfSession() per actor (opzionale)
 * @returns {object} debrief payload
 */
function buildDebriefSummary(session, vcSnapshot, peResult, pfSession = {}) {
  // 2026-04-26 (Q19 resolved Opzione A): PE→PI conversion gated su outcome=victory
  // (StS gold analogy). Defeat/timeout = PE earned ma non convertito; resta in pool campaign-wide.
  const isVictory = session?.outcome === 'victory';
  const conversion = isVictory
    ? convertPE(peResult.session_total)
    : { pi_gained: 0, pe_remaining: peResult.session_total };

  // 2026-04-26 P0 quick-win — Disco MBTI tag debrief (Tier S donor).
  // Genera 1-2 narrative insight per actor (italiano, diegetic, NO statistic dump).
  // Best-effort: missing module non blocca debrief.
  let mbtiInsights = {};
  try {
    const { buildMbtiInsights } = require('./narrative/mbtiInsights');
    mbtiInsights = buildMbtiInsights(vcSnapshot, { axisCount: 1, includeEnnea: true });
  } catch {
    // narrative module optional
  }

  // E-residual #2 (2026-04-27) — QBN debrief wire (Surface-DEAD sweep).
  // QBN engine (qbnEngine.drawEvent) era orphan: 17 events YAML caricati,
  // zero chiamate da session route. Wire here per esporre 1 narrative event
  // per debrief, basato su VC qualities + history. Best-effort, non blocca.
  let narrativeEvent = null;
  try {
    const { drawEvent } = require('./narrative/qbnEngine');
    const result = drawEvent({
      vcSnapshot,
      runState: {
        turns_played: vcSnapshot.turns_played || 0,
        victories: isVictory ? 1 : 0,
      },
      history: session?.qbn_history || {},
      seed: session?.session_id || 'debrief',
    });
    if (result && result.event) {
      narrativeEvent = {
        id: result.event.id,
        title_it: result.event.title_it || result.event.title || null,
        body_it: result.event.body_it || result.event.body || null,
        choices: Array.isArray(result.event.choices) ? result.event.choices : [],
        eligible_count: result.eligible_count,
      };
    }
  } catch {
    // qbnEngine optional / pack missing — non blocca debrief
  }

  // 2026-05-06 TKT-P4-ENNEA-VOICE-FRONTEND — wire ennea voice in debrief
  // payload (Engine LIVE Surface DEAD #1 P4). Engine 9/9 archetype + 7
  // beat × ~189 line authorate + endpoint /:id/voice live, ZERO frontend
  // caller in-session pre-fix. Wire here per emit 1 voice line per actor
  // con triggered ennea archetypes, beat=victory_solo|defeat_critical
  // basato outcome. Best-effort: missing module non blocca debrief.
  let enneaVoices = [];
  try {
    const { selectEnneaVoice } = require('../../../services/narrative/narrativeEngine');
    const beatId = isVictory ? 'victory_solo' : 'defeat_critical';
    // Deterministic seed per session_id per reproducibility (test).
    const seedSrc = String(session?.session_id || 'debrief');
    let seedHash = 0;
    for (let i = 0; i < seedSrc.length; i += 1) {
      seedHash = (seedHash + seedSrc.charCodeAt(i) * 16777619) >>> 0;
    }
    let s = seedHash >>> 0;
    const rand = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (const [actorId, vc] of Object.entries(vcSnapshot.per_actor || {})) {
      if (!Array.isArray(vc.ennea_archetypes) || vc.ennea_archetypes.length === 0) continue;
      const selection = selectEnneaVoice(vc.ennea_archetypes, beatId, { rand });
      if (selection) {
        enneaVoices.push({
          actor_id: actorId,
          archetype_id: selection.archetype_id,
          ennea_type: selection.ennea_type,
          beat_id: selection.beat_id,
          line_id: selection.line_id,
          text: selection.text,
        });
      }
    }
  } catch {
    // narrativeEngine / enneaVoice module optional — non blocca debrief
  }

  // Sprint 12 (Surface-DEAD #4) — Mating lifecycle wire.
  // Engine LIVE in metaProgression (rollMatingOffspring + canMate). Surface
  // DEAD pre-Sprint 12: ciclo Nido→offspring→lineage_id non visibile a fine
  // encounter. Wire here per emettere pair-bond candidates dei survivors
  // player team. Solo su victory (defeat = niente lineage). Best-effort.
  let matingEligibles = [];
  if (isVictory) {
    try {
      const { computeMatingEligibles } = require('./mating/computeMatingEligibles');
      const biomeId =
        session?.encounter?.biome_id || session?.encounter?.biome || session?.biome_id || null;
      matingEligibles = computeMatingEligibles(session?.units, biomeId);
    } catch {
      // mating helper optional — non blocca debrief
    }
  }

  return {
    session_id: session.session_id,
    turns_played: vcSnapshot.turns_played || 0,
    // Economy
    economy: {
      pe_earned: peResult.per_actor,
      pe_session_total: peResult.session_total,
      pi_converted: conversion.pi_gained,
      pe_remaining: conversion.pe_remaining,
      conversion_gate: isVictory ? 'victory' : session?.outcome || 'pending',
      // seed_earned: rimosso 2026-04-26 — orphan currency (zero sink finché V3 mating/harvester live)
    },
    // VC performance
    vc_summary: {
      per_actor: Object.fromEntries(
        Object.entries(vcSnapshot.per_actor || {}).map(([uid, vc]) => [
          uid,
          {
            aggregate_indices: vc.aggregate_indices,
            mbti_type: vc.mbti_type,
            ennea_archetypes: vc.ennea_archetypes,
          },
        ]),
      ),
    },
    // P0 Tier S — Disco MBTI tag debrief (P4 surfacing, narrative diegetic).
    mbti_insights: mbtiInsights,
    // E-residual #2 — QBN narrative event (1 event per debrief, eligible by VC).
    narrative_event: narrativeEvent,
    // Sprint 12 (Surface-DEAD #4) — Mating lifecycle eligibles.
    // Pair survivors (player team) candidates per offspring nel biome corrente.
    // Empty array quando defeat / 0-1 survivor / engine missing (graceful).
    mating_eligibles: matingEligibles,
    // 2026-05-06 TKT-P4-ENNEA-VOICE-FRONTEND — Ennea voice palette per actor.
    // 1 line per actor con triggered ennea archetypes. Beat selected by outcome
    // (victory_solo | defeat_critical). Empty quando no archetypes triggered.
    ennea_voices: enneaVoices,
    // Personality projection
    pf_session: pfSession,
    // Combat stats
    combat: {
      total_events: (session.events || []).length,
      kills: Object.values(session.damage_taken || {}).filter((v) => v <= 0).length,
    },
  };
}

module.exports = {
  PE_BASE_BY_DIFFICULTY,
  PE_PER_PI,
  VC_BONUS_THRESHOLDS,
  computeSessionPE,
  convertPE,
  buildDebriefSummary,
};
