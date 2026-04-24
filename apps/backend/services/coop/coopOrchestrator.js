// M16 — coopOrchestrator skeleton (ADR-2026-04-26-m15 / coop-mvp-spec.md).
// Phase machine + character creation + world setup + combat wiring + debrief.
// Skeleton only: interface defined, wire implementations M17-M19.

'use strict';

const PHASES = ['lobby', 'character_creation', 'world_setup', 'combat', 'debrief', 'ended'];

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
  constructor({ roomCode, hostId, now = Date.now }) {
    if (!roomCode) throw new Error('room_code_required');
    this.roomCode = roomCode;
    this.hostId = hostId || null;
    this.now = now;
    this.phase = 'lobby';
    this.run = null; // populated by startRun()
    this.characters = new Map(); // player_id → character spec
    this.worldVotes = new Map(); // player_id → scenario_id|null
    this.debriefChoices = new Map();
    this.log = [];
    this._listeners = new Set();
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
    this._setPhase('character_creation');
    this._emit('run_started', { run_id: this.run.id });
    return this.run;
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
    const normalized = {
      player_id: playerId,
      name: String(spec.name).slice(0, 30),
      form_id: String(spec.form_id),
      species_id: spec.species_id ? String(spec.species_id) : null,
      job_id: spec.job_id ? String(spec.job_id) : 'guerriero',
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
  confirmWorld({ scenarioId } = {}) {
    if (this.phase !== 'world_setup') throw new Error('not_in_world_setup');
    const sid = scenarioId || this.run?.scenarioStack?.[this.run.currentIndex];
    if (!sid) throw new Error('scenario_required');
    this.run.scenarioStack[this.run.currentIndex] = sid;
    this._emit('world_confirmed', { scenario_id: sid });
    this._setPhase('combat');
    return { scenario_id: sid };
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
