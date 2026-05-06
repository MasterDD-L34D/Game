// M16 — coopOrchestrator skeleton (ADR-2026-04-26-m15 / coop-mvp-spec.md).
// Phase machine + character creation + world setup + combat wiring + debrief.
// Skeleton only: interface defined, wire implementations M17-M19.

'use strict';

// 2026-05-06 narrative onboarding port — `onboarding` phase added per
// canonical `docs/core/51-ONBOARDING-60S.md` Phase B. Sequence:
// lobby → onboarding → character_creation → world_setup → combat → debrief.
// Onboarding = host-only single-choice identity step (60s timer, 3 cards
// pre-Act 0). character_creation = per-player PG submit (Jackbox M17).
const PHASES = [
  'lobby',
  'onboarding',
  'character_creation',
  'world_setup',
  'combat',
  'debrief',
  'ended',
];

/**
 * Build a unit payload for /session/start from a coop character spec.
 * Used by M16 fix P0-1 (PG mapping to player_id).
 */
function characterToUnit(character, { index = 0 } = {}) {
  if (!character || typeof character !== 'object') return null;
  const job = character.job_id || character.job || 'guerriero';
  return {
    id: character.unit_id || `pg_${character.player_id || index}`,
    name: character.name || 'PG',
    species: character.species_id || 'unknown',
    job,
    form_id: character.form_id || null,
    owner_id: character.player_id || null,
    controlled_by: 'player',
    hp: character.hp || character.hp_max || 22,
    max_hp: character.hp_max || character.hp || 22,
    ap: character.ap_max || 2,
    traits: Array.isArray(character.traits) ? character.traits : [],
    position: character.position || { x: index, y: 0 },
  };
}

class CoopOrchestrator {
  constructor({ roomCode, hostId, now = Date.now, worldEnricher = null } = {}) {
    if (!roomCode) throw new Error('room_code_required');
    this.roomCode = roomCode;
    this.hostId = hostId || null;
    this.now = now;
    this.phase = 'lobby';
    this.run = null; // populated by startRun()
    this.characters = new Map(); // player_id → character spec
    this.worldVotes = new Map(); // player_id → scenario_id|null
    this.debriefChoices = new Map();
    // 2026-05-06 narrative onboarding port — host single-choice identity
    // for entire branco. Pre-assigned trait propagated to all party
    // members on character_creation transition.
    this.onboardingChoice = null; // { option_key, trait_id, label, narrative, auto_selected, ts }
    // 2026-05-06 phone smoke W8b — track per-player reveal acknowledgment
    // for the UI-only `world_seed_reveal` transient phase. When all
    // expected players ack, auto-advance world_seed_reveal → world_setup.
    this.revealAcks = new Set();
    this.log = [];
    this._listeners = new Set();
    // W5-bb (cross-repo Godot v2 mirror) — world enricher service injection.
    // Default lazy-loads the canonical service module on first use.
    this._worldEnricher = worldEnricher;
    this.enrichedWorld = null; // populated by confirmWorld() with rich schema
  }

  _getWorldEnricher() {
    if (this._worldEnricher) return this._worldEnricher;
    // eslint-disable-next-line global-require
    this._worldEnricher = require('./worldEnricher');
    return this._worldEnricher;
  }

  _emit(kind, payload = {}) {
    const evt = { kind, payload, ts: this.now(), phase: this.phase };
    this.log.push(evt);
    if (this.log.length > 500) this.log.shift();
    for (const cb of this._listeners) {
      try {
        cb(evt);
      } catch {
        // swallow
      }
    }
    return evt;
  }

  on(cb) {
    if (typeof cb !== 'function') return () => {};
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  _setPhase(next) {
    if (!PHASES.includes(next)) throw new Error(`invalid_phase:${next}`);
    if (this.phase === next) return;
    const prev = this.phase;
    this.phase = next;
    this._emit('phase_change', { from: prev, to: next });
  }

  /**
   * Start a new run. Moves phase lobby → character_creation.
   */
  startRun({ scenarioStack = ['enc_tutorial_01'] } = {}) {
    if (this.phase !== 'lobby' && this.phase !== 'ended') {
      throw new Error(`cannot_start_from_phase:${this.phase}`);
    }
    this.run = {
      id: `run_${Date.now().toString(36)}`,
      scenarioStack: Array.isArray(scenarioStack) ? scenarioStack : ['enc_tutorial_01'],
      currentIndex: 0,
      partyXp: 0,
      partyPi: 0,
      outcome: null,
    };
    this.characters.clear();
    this.worldVotes.clear();
    this.debriefChoices.clear();
    this.revealAcks.clear();
    this.onboardingChoice = null;
    this._setPhase('character_creation');
    this._emit('run_started', { run_id: this.run.id });
    return this.run;
  }

  /**
   * 2026-05-06 narrative onboarding port — start a run with onboarding
   * phase. Sequence: lobby → onboarding → character_creation. Backwards-
   * compatible alternative to startRun() (which goes directly to
   * character_creation). Used by Godot phone Sprint M.6+ flow.
   *
   * Caller (wsSession.js intent handler `phase=onboarding`) is
   * responsible for loading the campaign onboarding definition + sending
   * it to clients via state broadcast. submitOnboardingChoice() then
   * receives a pre-resolved choice object.
   */
  startOnboarding({ scenarioStack = ['enc_tutorial_01'] } = {}) {
    if (this.phase !== 'lobby' && this.phase !== 'ended') {
      throw new Error(`cannot_start_from_phase:${this.phase}`);
    }
    this.run = {
      id: `run_${Date.now().toString(36)}`,
      scenarioStack: Array.isArray(scenarioStack) ? scenarioStack : ['enc_tutorial_01'],
      currentIndex: 0,
      partyXp: 0,
      partyPi: 0,
      outcome: null,
    };
    this.characters.clear();
    this.worldVotes.clear();
    this.debriefChoices.clear();
    this.revealAcks.clear();
    this.onboardingChoice = null;
    this._setPhase('onboarding');
    this._emit('run_started', { run_id: this.run.id, with_onboarding: true });
    return this.run;
  }

  /**
   * 2026-05-06 narrative onboarding port — host submits identity choice
   * for entire branco. Auto-advances onboarding → character_creation on
   * success. Host-only enforcement: only `hostId` may submit. Choice
   * object pre-resolved by caller from campaign onboarding YAML.
   *
   * @param playerId — submitting player (must equal hostId)
   * @param choice — { option_key, trait_id, label, narrative, auto_selected }
   * @param hostId — current host player id (host-only gate)
   */
  submitOnboardingChoice(playerId, choice, { hostId } = {}) {
    if (this.phase !== 'onboarding') throw new Error('not_in_onboarding');
    if (!playerId) throw new Error('player_id_required');
    if (hostId && playerId !== hostId) throw new Error('host_only');
    if (!choice || !choice.option_key || !choice.trait_id) {
      throw new Error('choice_invalid');
    }
    const normalized = {
      option_key: String(choice.option_key),
      trait_id: String(choice.trait_id),
      label: choice.label ? String(choice.label) : null,
      narrative: choice.narrative ? String(choice.narrative) : null,
      auto_selected: Boolean(choice.auto_selected),
      submitted_by: playerId,
      submitted_at: this.now(),
    };
    this.onboardingChoice = normalized;
    this._emit('onboarding_chosen', normalized);
    this._setPhase('character_creation');
    return normalized;
  }

  /**
   * Submit character spec for a player. When all expected players
   * have submitted, auto-transition to world_setup.
   *
   * @param playerId
   * @param spec — { name, form_id, species_id, job_id? }
   * @param allPlayerIds — set of player ids expected to participate
   */
  submitCharacter(playerId, spec, { allPlayerIds = [] } = {}) {
    if (this.phase !== 'character_creation') {
      throw new Error('not_in_character_creation');
    }
    if (!playerId) throw new Error('player_id_required');
    if (!spec || !spec.form_id || !spec.name) {
      throw new Error('spec_invalid');
    }
    // F-3 2026-04-25 — reject stale/ghost client with valid token but no longer in room.
    if (allPlayerIds.length > 0 && !allPlayerIds.includes(playerId)) {
      throw new Error('player_not_in_room');
    }
    // 2026-05-06 TKT-P3-INNATA-TRAIT-GRANT — apply innata trait from form.
    // Canonical PI-Pacchetti-Forme: ogni Forma assegna 1 trait garantito.
    // Pool 16 form × 1 trait_id mapped in mbti_forms.yaml.
    let baseTraits = Array.isArray(spec.traits) ? [...spec.traits] : [];
    try {
      // eslint-disable-next-line global-require
      const { applyInnataTraitGrant } = require('../forms/formInnataTrait');
      const granted = applyInnataTraitGrant({
        form_id: spec.form_id,
        traits: baseTraits,
      });
      if (Array.isArray(granted?.traits)) {
        baseTraits = granted.traits;
      }
    } catch {
      // formInnataTrait helper optional — non blocca character submit.
    }
    const normalized = {
      player_id: playerId,
      name: String(spec.name).slice(0, 30),
      form_id: String(spec.form_id),
      species_id: spec.species_id ? String(spec.species_id) : null,
      job_id: spec.job_id ? String(spec.job_id) : 'guerriero',
      traits: baseTraits,
      ready: true,
      submitted_at: this.now(),
    };
    this.characters.set(playerId, normalized);
    this._emit('character_ready', normalized);

    const expected = new Set(allPlayerIds.filter(Boolean));
    if (expected.size > 0 && expected.size === this.characters.size) {
      const allReady = Array.from(expected).every((pid) => this.characters.has(pid));
      if (allReady) this._setPhase('world_setup');
    }
    return normalized;
  }

  /**
   * Return the current character list ready-state snapshot.
   */
  characterReadyList(allPlayerIds = []) {
    return allPlayerIds.map((pid) => {
      const ch = this.characters.get(pid);
      return {
        player_id: pid,
        name: ch?.name || null,
        form_id: ch?.form_id || null,
        species_id: ch?.species_id || null,
        ready: Boolean(ch?.ready),
      };
    });
  }

  /**
   * Confirm scenario for this run. Moves phase world_setup → combat.
   * Voting logic deferred to M17 (host confirm for MVP).
   */
  confirmWorld({ scenarioId, biomeId, formAxes, runSeed, trainerCanonical } = {}) {
    if (this.phase !== 'world_setup') throw new Error('not_in_world_setup');
    const sid = scenarioId || this.run?.scenarioStack?.[this.run.currentIndex];
    if (!sid) throw new Error('scenario_required');
    this.run.scenarioStack[this.run.currentIndex] = sid;
    // W5-bb cross-repo: enrich with rich W5 schema (world+ermes+aliena+custode)
    // when biomeId provided. Backwards-compat: caller may omit biomeId for
    // legacy paths; enriched_world stays null.
    let enrichedWorld = null;
    if (biomeId && typeof biomeId === 'string') {
      try {
        const enricher = this._getWorldEnricher();
        // Codex W5.5 P1 fix: pass confirmed party to enricher so
        // ermes.role_gap reflects the actual party composition. Without
        // this, role_gap was always computed from [] → every demanded
        // role reported as fully under-represented (false negative).
        enrichedWorld = enricher.enrichWorld({
          biomeId,
          formAxes: formAxes || {},
          party: Array.from(this.characters.values()),
          runSeed: Number.isFinite(runSeed) ? runSeed : 0,
          trainerCanonical: Boolean(trainerCanonical),
        });
        this.enrichedWorld = enrichedWorld;
      } catch (err) {
        // Enricher failure must not break confirmWorld phase transition.
        // Log but proceed — Godot client falls back to sample JSON gracefully.
        this._emit('world_enricher_failed', { error: String(err && err.message) });
      }
    }
    this._emit('world_confirmed', { scenario_id: sid, biome_id: biomeId || null });
    this._setPhase('combat');
    return {
      scenario_id: sid,
      enriched_world: enrichedWorld,
    };
  }

  /**
   * M18 — Player casts vote on proposed scenario. accept=true/false.
   * Host remains arbiter and must still confirmWorld() to commit.
   */
  voteWorld(playerId, { scenarioId, accept = true, allPlayerIds = [] } = {}) {
    if (this.phase !== 'world_setup') throw new Error('not_in_world_setup');
    if (!playerId) throw new Error('player_id_required');
    const sid = scenarioId || this.run?.scenarioStack?.[this.run.currentIndex];
    this.worldVotes.set(playerId, {
      scenario_id: sid,
      accept: Boolean(accept),
      ts: this.now(),
    });
    this._emit('world_vote', { player_id: playerId, scenario_id: sid, accept });
    return this.worldTally(allPlayerIds);
  }

  /**
   * M19 — List of player ids that have submitted a debrief choice.
   */
  debriefReadyList(allPlayerIds = []) {
    return allPlayerIds.map((pid) => ({
      player_id: pid,
      ready: this.debriefChoices.has(pid),
      choice: this.debriefChoices.get(pid) || null,
    }));
  }

  /**
   * 2026-05-06 W8b — Acknowledge reveal screen for player. Used during
   * UI-only `world_seed_reveal` transient phase. Returns ready-set
   * snapshot. Caller should auto-advance to world_setup when all
   * expected players have acknowledged.
   *
   * @param playerId
   * @param allPlayerIds — set of player ids expected to acknowledge
   * @returns { acknowledged: Set, ready_count, total, all_ready }
   */
  acknowledgeReveal(playerId, { allPlayerIds = [] } = {}) {
    if (!playerId) throw new Error('player_id_required');
    this.revealAcks.add(playerId);
    this._emit('reveal_ack', { player_id: playerId });
    const expected = new Set(allPlayerIds.filter(Boolean));
    const total = expected.size || this.revealAcks.size;
    const readyCount = this.revealAcks.size;
    const allReady =
      expected.size > 0 && Array.from(expected).every((pid) => this.revealAcks.has(pid));
    return {
      ready_count: readyCount,
      total,
      all_ready: allReady,
      acknowledged: Array.from(this.revealAcks),
    };
  }

  /**
   * 2026-05-06 W8b — Reveal ack list for broadcast.
   */
  revealAckList(allPlayerIds = []) {
    return allPlayerIds.map((pid) => ({
      player_id: pid,
      acknowledged: this.revealAcks.has(pid),
    }));
  }

  /**
   * M18 — Tally current world votes. Returns counts + breakdown.
   */
  worldTally(allPlayerIds = []) {
    let accept = 0;
    let reject = 0;
    const perPlayer = {};
    for (const [pid, vote] of this.worldVotes.entries()) {
      if (vote.accept) accept += 1;
      else reject += 1;
      perPlayer[pid] = vote;
    }
    return {
      scenario_id: this.run?.scenarioStack?.[this.run.currentIndex] || null,
      accept,
      reject,
      total: allPlayerIds.length || accept + reject,
      pending: Math.max(allPlayerIds.length - (accept + reject), 0),
      per_player: perPlayer,
    };
  }

  /**
   * Build the /session/start payload from current characters.
   * Used by M17+ host handler that forwards to existing session route.
   */
  buildSessionStartPayload() {
    const units = [];
    let idx = 0;
    for (const ch of this.characters.values()) {
      units.push(characterToUnit(ch, { index: idx++ }));
    }
    return { units };
  }

  /**
   * Mark combat outcome. Moves phase combat → debrief.
   */
  endCombat({ outcome = 'victory', survivors = [], xpEarned = 0 } = {}) {
    if (this.phase !== 'combat') throw new Error('not_in_combat');
    this.run.outcome = outcome;
    this.run.partyXp += xpEarned;
    this._emit('combat_ended', { outcome, survivors, xp: xpEarned });
    this._setPhase('debrief');
    return { outcome, xp: xpEarned };
  }

  /**
   * Submit debrief choice for player. When all submitted, advance.
   */
  submitDebriefChoice(playerId, choice, { allPlayerIds = [] } = {}) {
    if (this.phase !== 'debrief') throw new Error('not_in_debrief');
    this.debriefChoices.set(playerId, choice);
    this._emit('debrief_choice', { player_id: playerId, choice });
    const expected = new Set(allPlayerIds.filter(Boolean));
    if (expected.size > 0 && this.debriefChoices.size >= expected.size) {
      return this.advanceScenarioOrEnd();
    }
    return null;
  }

  /**
   * F-2 2026-04-25 — host-only force-advance escape hatch.
   * Unstucks `character_creation` (player dropped before submit) or
   * `debrief` (player dropped before choice). Only whitelisted transitions
   * allowed to preserve invariants.
   *
   * Whitelist:
   *   character_creation → world_setup (abandon ghost characters)
   *   debrief → world_setup|ended (delegate to advanceScenarioOrEnd)
   *
   * @param reason — human-readable cause, logged in emit.
   */
  forceAdvance({ reason = 'host_override' } = {}) {
    if (this.phase === 'character_creation') {
      this._emit('force_advance', { from: 'character_creation', to: 'world_setup', reason });
      this._setPhase('world_setup');
      return { action: 'forced_to_world_setup', from: 'character_creation' };
    }
    if (this.phase === 'debrief') {
      this._emit('force_advance', { from: 'debrief', reason });
      return this.advanceScenarioOrEnd();
    }
    throw new Error(`force_advance_not_allowed_from:${this.phase}`);
  }

  advanceScenarioOrEnd() {
    if (!this.run) throw new Error('no_run');
    this.run.currentIndex += 1;
    if (this.run.currentIndex >= this.run.scenarioStack.length) {
      this._setPhase('ended');
      this._emit('run_ended', { run_id: this.run.id });
      return { action: 'ended' };
    }
    this.characters.forEach((ch) => {
      ch.ready = true; // carry over
    });
    this.debriefChoices.clear();
    this.worldVotes.clear();
    this._setPhase('world_setup');
    return { action: 'next_scenario', index: this.run.currentIndex };
  }

  snapshot() {
    return {
      roomCode: this.roomCode,
      phase: this.phase,
      run: this.run,
      characters: Array.from(this.characters.values()),
      log: this.log.slice(-50),
    };
  }
}

module.exports = { CoopOrchestrator, characterToUnit, PHASES };
