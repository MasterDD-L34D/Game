// M16 — coopOrchestrator skeleton (ADR-2026-04-26-m15 / coop-mvp-spec.md).
// Phase machine + character creation + world setup + combat wiring + debrief.
// Skeleton only: interface defined, wire implementations M17-M19.

'use strict';

const crypto = require('crypto');
const { foldObservations } = require('../ai/sistemaStateAccumulator');
const { createSistemaStateStore } = require('../ai/sistemaStateStore');
const { createRosterStore } = require('../campaign/rosterStore');
const { checkNidoUnlock } = require('../../routes/sessionHelpers');

// CAMP-1/CAMP-2 - run.id is the SistemaState persistence key (server writes
// SistemaState under run.id; Godot client keys CampaignState.campaign_id on
// it). The legacy `run_${Date.now().toString(36)}` collided when two runs
// were created in the same millisecond, causing cross-run learning bleed.
// crypto.randomUUID() is collision-resistant; the `run_` prefix is preserved.
function newRunId() {
  return `run_${crypto.randomUUID()}`;
}

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
  'nido', // N1 Nido-hub phase (return-to-hub loop step, after debrief)
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
    // OD-026 — preserve default_parts (sensory bag, e.g.
    // { senses: ['echolocation'] }) so the senseReveal echolocation pulse
    // mechanic can fire for an actor that declares the sense. Additive:
    // only carried through when the character actually declares it; absent
    // default_parts stays absent (back-compat, no behaviour change).
    ...(character.default_parts && typeof character.default_parts === 'object'
      ? { default_parts: character.default_parts }
      : {}),
  };
}

class CoopOrchestrator {
  constructor({
    roomCode,
    hostId,
    now = Date.now,
    worldEnricher = null,
    sistemaStateStore = null,
    rosterStore = null,
    nidoUnlocked = false,
  } = {}) {
    if (!roomCode) throw new Error('room_code_required');
    this.roomCode = roomCode;
    this.hostId = hostId || null;
    this.now = now;
    // N1 Nido-hub — pre-seeded unlock flag (DI seam for tests + server-side
    // room construction). When true, debrief advance routes to 'nido' instead
    // of directly to world_setup. env NIDO_UNLOCKED=true also activates the
    // gate (checked at call-time via checkNidoUnlock).
    this._nidoUnlocked = Boolean(nidoUnlocked);
    // CAMP-2 — SistemaState accumulation store (DI seam, same style as
    // worldEnricher). Default lazily wires the canonical Prisma-backed store
    // on first use so module-load order / stub-mode (no DATABASE_URL) stays
    // safe. Tests inject a stub recording get/upsert.
    this._sistemaStore = sistemaStateStore;
    // N2 roster-display -- run-keyed party_rosters persistence (DI seam, same
    // style as sistemaStateStore). Lazily wires the canonical Prisma store on
    // first use so module-load order / stub-mode stays safe.
    this._rosterStore = rosterStore;
    this.phase = 'lobby';
    this.run = null; // populated by startRun()
    this.characters = new Map(); // player_id → character spec
    this.worldVotes = new Map(); // player_id → scenario_id|null
    // S22-B -- per-player mating pair vote { player_id -> { pair_id, ts } }.
    this.matingVotes = new Map();
    // GAP-C fase-3 -- per-player meta-network route vote { player_id ->
    // { node_id, ts } } + the open candidate list. Phase-agnostic storage
    // (mirror formPulses/revealAcks): the route choice is offered at the
    // debrief->next-encounter transition when POST /api/campaign/advance
    // returns >1 candidate. Open candidates (set by openRouteChoice) gate
    // voteRoute, not a strict PHASES enum value.
    this.routeVotes = new Map();
    this.routeCandidates = null;
    this.debriefChoices = new Map();
    // 2026-05-06 narrative onboarding port — host single-choice identity
    // for entire branco. Pre-assigned trait propagated to all party
    // members on character_creation transition.
    this.onboardingChoice = null; // { option_key, trait_id, label, narrative, auto_selected, ts }
    // 2026-05-06 phone smoke W8b — track per-player reveal acknowledgment
    // for the UI-only `world_seed_reveal` transient phase. When all
    // expected players ack, auto-advance world_seed_reveal → world_setup.
    this.revealAcks = new Set();
    // 2026-05-06 phone smoke W4 — per-player form_pulse axes submitted
    // during the post-character_creation evolution-tuning step. Drained
    // server-side via submitFormPulse; phase-agnostic storage so Godot
    // UI-only `form_pulse` transient phase can populate without strict
    // coupling to PHASES enum (mirror revealAcks pattern).
    this.formPulses = new Map(); // player_id → { axes: {k:Number}, ts }
    this.log = [];
    this._listeners = new Set();
    // W5-bb (cross-repo Godot v2 mirror) — world enricher service injection.
    // Default lazy-loads the canonical service module on first use.
    this._worldEnricher = worldEnricher;
    this.enrichedWorld = null; // populated by confirmWorld() with rich schema
    // PR-1 §22 coop-WS surface — combat session id (POST /api/session/start)
    // linked back via coopStore.linkSession so phase_change can surface it.
    this.sessionId = null;
  }

  _getWorldEnricher() {
    if (this._worldEnricher) return this._worldEnricher;
    // eslint-disable-next-line global-require
    this._worldEnricher = require('./worldEnricher');
    return this._worldEnricher;
  }

  _getSistemaStore() {
    if (this._sistemaStore) return this._sistemaStore;
    // eslint-disable-next-line global-require
    this._sistemaStore = createSistemaStateStore(require('../../db/prisma').prisma);
    return this._sistemaStore;
  }

  _getRosterStore() {
    if (this._rosterStore) return this._rosterStore;
    // eslint-disable-next-line global-require
    this._rosterStore = createRosterStore(require('../../db/prisma').prisma);
    return this._rosterStore;
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
   * 2026-05-20 — sync orchestrator hostId with current Room host post
   * transfer (coop-phase-validator audit Finding 1 fix). Without this,
   * `orch.hostId` stays frozen at construction time and any caller relying
   * on it for host-only gates (`submitOnboardingChoice`, `submitNextMacro`)
   * would silently pass for the wrong player after host transfer.
   *
   * Idempotent: no-op when newHostId matches current. Emits
   * `host_id_synced` event with previous + new id for telemetry.
   *
   * @param {string|null} newHostId
   * @returns {boolean} true if hostId changed, false if no-op
   */
  setHostId(newHostId) {
    if (newHostId === this.hostId) return false;
    const previousHostId = this.hostId;
    this.hostId = newHostId || null;
    this._emit('host_id_synced', { previous: previousHostId, current: this.hostId });
    return true;
  }
  /**
   * PR-1 §22 coop-WS surface — link the combat session id (created by
   * POST /api/session/start, keyed in coop flow on run.id == campaign_id)
   * so broadcastCoopState/phaseChangePayload can surface it to phone clients
   * for ALIENA telemetry fetch on debrief. Idempotent: no-op when unchanged.
   *
   * @param {string|null} sessionId
   * @returns {boolean} true if sessionId changed, false if no-op
   */
  setSessionId(sessionId) {
    const next = sessionId || null;
    if (next === this.sessionId) return false;
    this.sessionId = next;
    return true;
  }

  /**
   * Start a new run. Moves phase lobby → character_creation.
   */
  startRun({ scenarioStack = ['enc_tutorial_01'] } = {}) {
    if (this.phase !== 'lobby' && this.phase !== 'ended') {
      throw new Error(`cannot_start_from_phase:${this.phase}`);
    }
    this.run = {
      id: newRunId(),
      scenarioStack: Array.isArray(scenarioStack) ? scenarioStack : ['enc_tutorial_01'],
      currentIndex: 0,
      partyXp: 0,
      partyPi: 0,
      outcome: null,
      matingResolved: false,
      survivors: [],
    };
    this.characters.clear();
    this.worldVotes.clear();
    this.sessionId = null;
    this.matingVotes.clear();
    this.routeVotes.clear();
    this.routeCandidates = null;
    this.debriefChoices.clear();
    this.revealAcks.clear();
    this.formPulses.clear();
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
      id: newRunId(),
      scenarioStack: Array.isArray(scenarioStack) ? scenarioStack : ['enc_tutorial_01'],
      currentIndex: 0,
      partyXp: 0,
      partyPi: 0,
      outcome: null,
      matingResolved: false,
      survivors: [],
    };
    this.characters.clear();
    this.worldVotes.clear();
    this.sessionId = null;
    this.matingVotes.clear();
    this.routeVotes.clear();
    this.routeCandidates = null;
    this.debriefChoices.clear();
    this.revealAcks.clear();
    this.formPulses.clear();
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
    if (!playerId) throw new Error('player_id_required');
    if (!spec || !spec.form_id || !spec.name) {
      throw new Error('spec_invalid');
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
    // B-NEW-5 fix 2026-05-08 — idempotent submission. Phone smoke iter4
    // friends-online (lobby XHPV) shipped 19 character_ready emissions in
    // 175s with last 5 within 700ms: phone composer doesn't lock submit
    // button post-tap, plus WS reconnect flushes buffered intents → backend
    // re-emits + re-broadcasts identical state. Now: when same player
    // resubmits an equivalent spec (name + form_id + species_id + job_id +
    // traits identical), reuse the prior submitted_at + skip emit/setPhase.
    //
    // Codex P2 #2134 follow-up: dedupe runs BEFORE the phase gate so a
    // retry burst arriving after auto-advance to world_setup (last ready
    // player edge) still short-circuits to a fresh ACK. Pre-fix the gate
    // threw not_in_character_creation, surfacing a spurious error toast on
    // the phone immediately after a successful confirmation.
    const prior = this.characters.get(playerId);
    const sameSpec =
      prior &&
      prior.name === String(spec.name).slice(0, 30) &&
      prior.form_id === String(spec.form_id) &&
      prior.species_id === (spec.species_id ? String(spec.species_id) : null) &&
      prior.job_id === (spec.job_id ? String(spec.job_id) : 'guerriero') &&
      Array.isArray(prior.traits) &&
      prior.traits.length === baseTraits.length &&
      prior.traits.every((t, i) => t === baseTraits[i]);
    if (sameSpec) {
      // Returned object surfaces a `_deduplicated` flag so WS/REST handlers
      // skip the downstream broadcast. ACK still fires for client UX.
      return Object.assign({}, prior, { _deduplicated: true });
    }
    if (this.phase !== 'character_creation') {
      throw new Error('not_in_character_creation');
    }
    // F-3 2026-04-25 — reject stale/ghost client with valid token but no longer in room.
    if (allPlayerIds.length > 0 && !allPlayerIds.includes(playerId)) {
      throw new Error('player_not_in_room');
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
    // N2 -- persist the created PG to party_rosters (run.id-keyed), best-effort
    // and fire-and-forget. Never block / throw into the submit path: the sync
    // try/catch covers a wiring throw (store construct), and the .catch covers
    // an async-rejecting upsert (the canonical store swallows internally).
    if (this.run && this.run.id) {
      try {
        const persisting = this._getRosterStore().upsert(this.run.id, normalized);
        if (persisting && typeof persisting.catch === 'function') {
          persisting.catch(() => {});
        }
      } catch (_err) {
        /* best-effort */
      }
    }
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
  voteWorld(playerId, { scenarioId, accept = true, allPlayerIds = [], connectedPlayerIds } = {}) {
    if (this.phase !== 'world_setup') throw new Error('not_in_world_setup');
    if (!playerId) throw new Error('player_id_required');
    const sid = scenarioId || this.run?.scenarioStack?.[this.run.currentIndex];
    this.worldVotes.set(playerId, {
      scenario_id: sid,
      accept: Boolean(accept),
      ts: this.now(),
    });
    this._emit('world_vote', { player_id: playerId, scenario_id: sid, accept });
    return this.worldTally(allPlayerIds, connectedPlayerIds);
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
   * 2026-05-06 phone smoke W4 — Submit form_pulse axes for player. UI-only
   * transient phase between character_creation and world_setup (Godot
   * Sprint W7 form_pulse view). Per-player axes stored independently of
   * `phase` enum so caller can drain submissions during any post-bootstrap
   * phase. Mirrors voteWorld pattern (no auto-advance; caller decides
   * when all axes collected to publishPhaseChange next).
   *
   * Pre-fix: phone player sent `intent {action: form_pulse_submit}` →
   * pushIntent relay to host → Godot host has no GDScript drain → silent
   * drop. Now drained via this method, broadcast `form_pulse_list`.
   *
   * @param playerId — submitting player
   * @param axes — { [axisKey]: Number } map (alpha/beta/gamma/delta…). Only
   *               numeric values retained; non-numeric or NaN dropped.
   * @param allPlayerIds — set of player ids expected to submit (for ready_set tally)
   * @returns { ready_count, total, all_ready, submitted: [player_id…] }
   */
  submitFormPulse(playerId, { axes = {} } = {}, { allPlayerIds = [] } = {}) {
    if (!playerId) throw new Error('player_id_required');
    if (!this.run) throw new Error('run_not_started');
    const cleanAxes = {};
    if (axes && typeof axes === 'object' && !Array.isArray(axes)) {
      for (const [k, v] of Object.entries(axes)) {
        const num = Number(v);
        if (Number.isFinite(num)) cleanAxes[k] = num;
      }
    }
    this.formPulses.set(playerId, { axes: cleanAxes, ts: this.now() });
    this._emit('form_pulse_submit', { player_id: playerId, axes: cleanAxes });
    const expected = new Set(allPlayerIds.filter(Boolean));
    const total = expected.size || this.formPulses.size;
    const readyCount = this.formPulses.size;
    const allReady =
      expected.size > 0 && Array.from(expected).every((pid) => this.formPulses.has(pid));
    return {
      ready_count: readyCount,
      total,
      all_ready: allReady,
      submitted: Array.from(this.formPulses.keys()),
    };
  }

  /**
   * 2026-05-06 phone smoke W4 — Form pulse list for broadcast (per-player
   * ready + axes snapshot).
   */
  formPulseList(allPlayerIds = []) {
    return allPlayerIds.map((pid) => {
      const entry = this.formPulses.get(pid);
      return {
        player_id: pid,
        ready: Boolean(entry),
        axes: entry?.axes || null,
      };
    });
  }

  /**
   * M18 — Tally current world votes. Returns counts + breakdown.
   *
   * B-NEW-1 fix 2026-05-08 — accept optional `connectedPlayerIds` so phone
   * smoke (Day 3/7 friends online) can compute quorum on connected players
   * only. Pre-fix: tally pending counted offline players → vote stuck
   * indefinitely when 2nd player WS dropped mid-vote. Now: caller may use
   * `all_connected_accepted` flag to advance phase even with offline peers.
   * Backward compat: when `connectedPlayerIds` omitted, behaves as before.
   */
  worldTally(allPlayerIds = [], connectedPlayerIds) {
    let accept = 0;
    let reject = 0;
    const perPlayer = {};
    for (const [pid, vote] of this.worldVotes.entries()) {
      if (vote.accept) accept += 1;
      else reject += 1;
      perPlayer[pid] = vote;
    }
    const tally = {
      scenario_id: this.run?.scenarioStack?.[this.run.currentIndex] || null,
      accept,
      reject,
      total: allPlayerIds.length || accept + reject,
      pending: Math.max(allPlayerIds.length - (accept + reject), 0),
      per_player: perPlayer,
    };
    if (Array.isArray(connectedPlayerIds)) {
      const connected = connectedPlayerIds.filter(Boolean);
      const connectedTotal = connected.length;
      let connectedAccept = 0;
      let connectedReject = 0;
      for (const pid of connected) {
        const vote = this.worldVotes.get(pid);
        if (!vote) continue;
        if (vote.accept) connectedAccept += 1;
        else connectedReject += 1;
      }
      const connectedVoted = connectedAccept + connectedReject;
      tally.connected_total = connectedTotal;
      tally.connected_accept = connectedAccept;
      tally.connected_reject = connectedReject;
      tally.connected_pending = Math.max(connectedTotal - connectedVoted, 0);
      // True only when at least one connected player has voted AND every
      // connected player voted accept. Empty connected set returns false
      // (caller should not auto-advance with zero participants).
      tally.all_connected_accepted =
        connectedTotal > 0 && connectedAccept === connectedTotal && connectedReject === 0;
    }
    return tally;
  }

  /**
   * S22-B -- player votes for an eligible mating pair (pair_id =
   * `${parent_a_id}__${parent_b_id}`). Debrief-phase only. Idempotent
   * re-vote (replaces). Mirror of voteWorld.
   */
  voteMating(playerId, pairId, { allPlayerIds = [], connectedPlayerIds } = {}) {
    if (this.phase !== 'debrief') throw new Error('not_in_debrief');
    if (!playerId) throw new Error('player_id_required');
    if (!pairId) throw new Error('pair_id_required');
    this.matingVotes.set(playerId, { pair_id: pairId, ts: this.now() });
    this._emit('mating_vote', { player_id: playerId, pair_id: pairId });
    return this.matingTally(allPlayerIds, connectedPlayerIds);
  }

  /**
   * S22-B -- tally mating votes. Returns per-pair counts, the leading
   * pair (deterministic tie-break: lowest pair_id lexicographic), and
   * quorum vs allPlayerIds. Mirror of worldTally shape.
   */
  matingTally(allPlayerIds = [], connectedPlayerIds) {
    const counts = new Map();
    const perPlayer = {};
    for (const [pid, vote] of this.matingVotes.entries()) {
      perPlayer[pid] = vote;
      counts.set(vote.pair_id, (counts.get(vote.pair_id) || 0) + 1);
    }
    const tallies = Array.from(counts.entries())
      .map(([pair_id, votes]) => ({ pair_id, votes }))
      .sort((x, y) => y.votes - x.votes || x.pair_id.localeCompare(y.pair_id));
    const voted = this.matingVotes.size;
    const tally = {
      tallies,
      leading_pair_id: tallies.length ? tallies[0].pair_id : null,
      total: allPlayerIds.length || voted,
      pending: Math.max((allPlayerIds.length || voted) - voted, 0),
      per_player: perPlayer,
    };
    if (Array.isArray(connectedPlayerIds)) {
      const connected = connectedPlayerIds.filter(Boolean);
      const connectedVoted = connected.filter((pid) => this.matingVotes.has(pid)).length;
      tally.connected_total = connected.length;
      tally.connected_voted = connectedVoted;
      tally.connected_pending = Math.max(connected.length - connectedVoted, 0);
      tally.all_connected_voted = connected.length > 0 && connectedVoted === connected.length;
    }
    return tally;
  }

  /**
   * GAP-C fase-3 -- open a meta-network route choice. Stores the candidate
   * list (from POST /api/campaign/advance route_choice.candidates) so phones
   * can vote per node_id and routeTally can break a tie by candidate.weight
   * (master-dd Q2). Clears any prior votes. Idempotent re-open replaces the
   * candidates + resets votes. Candidates without a node_id are dropped.
   *
   * @param candidates - array of candidate objects (need node_id; weight used
   *                     for tie-break, defaults to 0 when absent).
   * @returns the stored (normalized) candidate array.
   */
  openRouteChoice(candidates = []) {
    const list = Array.isArray(candidates) ? candidates.filter((c) => c && c.node_id != null) : [];
    this.routeCandidates = list;
    this.routeVotes.clear();
    this._emit('route_choice_open', { candidates: list });
    return list;
  }

  /**
   * GAP-C fase-3 -- player votes for a meta-network route node_id. Mirror of
   * voteWorld / voteMating. Idempotent re-vote (replaces). Requires an open
   * route choice (openRouteChoice) AND node_id to be one of the open
   * candidates. Returns the current routeTally.
   */
  voteRoute(playerId, nodeId, { allPlayerIds = [], connectedPlayerIds } = {}) {
    if (!this.routeCandidates || this.routeCandidates.length === 0) {
      throw new Error('route_choice_not_open');
    }
    if (!playerId) throw new Error('player_id_required');
    if (nodeId == null || nodeId === '') throw new Error('node_id_required');
    const valid = this.routeCandidates.some((c) => String(c.node_id) === String(nodeId));
    if (!valid) throw new Error('invalid_route_node');
    this.routeVotes.set(playerId, { node_id: nodeId, ts: this.now() });
    this._emit('route_vote', { player_id: playerId, node_id: nodeId });
    return this.routeTally(allPlayerIds, connectedPlayerIds);
  }

  /**
   * GAP-C fase-3 -- tally route votes. Per-node counts + the leading node +
   * quorum. Mirror of matingTally shape, BUT the tie-break is master-dd Q2:
   * on equal votes the highest candidate.weight wins (the Godot
   * RouteChoiceFlow.resolve_tie_break mirrors this client-side); node_id asc
   * is the deterministic final fallback so equal-weight ties stay stable.
   */
  routeTally(allPlayerIds = [], connectedPlayerIds) {
    const weightOf = (nodeId) => {
      const c = (this.routeCandidates || []).find((x) => String(x.node_id) === String(nodeId));
      const w = c ? Number(c.weight) : NaN;
      return Number.isFinite(w) ? w : 0;
    };
    const counts = new Map();
    const perPlayer = {};
    for (const [pid, vote] of this.routeVotes.entries()) {
      perPlayer[pid] = vote;
      counts.set(vote.node_id, (counts.get(vote.node_id) || 0) + 1);
    }
    const tallies = Array.from(counts.entries())
      .map(([node_id, votes]) => ({ node_id, votes, weight: weightOf(node_id) }))
      .sort(
        (x, y) =>
          y.votes - x.votes || // most votes wins
          y.weight - x.weight || // master-dd Q2 tie-break: highest weight
          String(x.node_id).localeCompare(String(y.node_id)), // deterministic fallback
      );
    const voted = this.routeVotes.size;
    const tally = {
      tallies,
      leading_node_id: tallies.length ? tallies[0].node_id : null,
      total: allPlayerIds.length || voted,
      pending: Math.max((allPlayerIds.length || voted) - voted, 0),
      per_player: perPlayer,
      candidates: this.routeCandidates || [],
    };
    if (Array.isArray(connectedPlayerIds)) {
      const connected = connectedPlayerIds.filter(Boolean);
      const connectedVoted = connected.filter((pid) => this.routeVotes.has(pid)).length;
      tally.connected_total = connected.length;
      tally.connected_voted = connectedVoted;
      tally.connected_pending = Math.max(connected.length - connectedVoted, 0);
      tally.all_connected_voted = connected.length > 0 && connectedVoted === connected.length;
    }
    return tally;
  }

  /**
   * S22-B Task 8 -- if mating quorum is met and not yet resolved, mark
   * resolved and return the winning pair (parsed ids). Idempotent: null on
   * subsequent calls or before quorum. Connected-only quorum (mirror world).
   */
  resolveMatingWinner(allPlayerIds = [], connectedPlayerIds = []) {
    if (!this.run || this.run.matingResolved) return null;
    const tally = this.matingTally(allPlayerIds, connectedPlayerIds);
    if (!tally.all_connected_voted || !tally.leading_pair_id) return null;
    const [parentAId, parentBId] = String(tally.leading_pair_id).split('__');
    // S22-B Task 8 (Codex P1) -- only resolve a pair whose BOTH parents are
    // actual surviving units. voteMating accepts any client pair_id, so a
    // bogus pair must NOT trigger an offspring roll. Leave matingResolved
    // false so a later legit pair can still win.
    const survivorIds = new Set(
      (this.run.survivors || [])
        .map((u) => (typeof u === 'string' ? u : u && (u.id || u.unit_id)))
        .filter(Boolean),
    );
    if (!parentAId || !parentBId || !survivorIds.has(parentAId) || !survivorIds.has(parentBId)) {
      return null;
    }
    this.run.matingResolved = true;
    return {
      pair_id: tally.leading_pair_id,
      parent_a_id: parentAId,
      parent_b_id: parentBId,
      biome_id: this.run.scenarioStack?.[this.run.currentIndex] || null,
      campaign_id: this.run.id,
    };
  }

  /**
   * 2026-05-06 phone smoke W7 — submit post-debrief macro navigation choice.
   * Host-only (mirror submitOnboardingChoice pattern). Choice ∈
   * {advance, branch, retreat}. Phase must be `debrief` or `ended` (post
   * debrief auto-advance). Records in `run.lastMacro` for telemetry +
   * downstream UI surface.
   *
   * Semantics:
   *  - `advance` — proceed to next scenario in stack. Delegates to
   *               advanceScenarioOrEnd() if phase=='debrief'. No-op if
   *               already advanced (phase != debrief).
   *  - `branch`  — same as advance for MVP; future Sprint Q ETL may pick
   *               an alternate scenario_id from a branch table.
   *  - `retreat` — early end. Forces phase='ended' + run.outcome ||=
   *               'retreated'. Players exit run without next scenario.
   *
   * Pre-fix: phone host sent `intent {action: next_macro, choice}` →
   * pushIntent relay → Godot host had no GDScript drain → silent drop.
   * Now drained server-side. Audit doc 2026-05-06-coop-phase-ws-audit.md
   * tracked as TKT-P5-WS-NEXT-MACRO-DESIGN ~2h.
   *
   * @param playerId — submitting player (must equal hostId)
   * @param choice — { choice: 'advance'|'branch'|'retreat' }
   * @param hostId — current host player id (host-only gate)
   * @returns { choice, phase, run_state, advance? }
   */
  submitNextMacro(playerId, { choice } = {}, { hostId } = {}) {
    if (!playerId) throw new Error('player_id_required');
    if (hostId && playerId !== hostId) throw new Error('host_only');
    if (!this.run) throw new Error('run_not_started');
    // Codex P2 review #2075: include `world_setup` to handle the case
    // where submitDebriefChoice already auto-advanced (last lineage
    // submission triggered advanceScenarioOrEnd → phase moved to
    // world_setup). UI may still emit next_macro post-ack; gate must
    // accept the no-op path documented for advance/branch when already
    // advanced.
    const VALID_PHASES = new Set(['debrief', 'world_setup', 'ended']);
    if (!VALID_PHASES.has(this.phase)) {
      throw new Error(`not_in_post_combat_phase:${this.phase}`);
    }
    const VALID_CHOICES = new Set(['advance', 'branch', 'retreat']);
    if (!VALID_CHOICES.has(choice)) throw new Error('macro_choice_invalid');
    this.run.lastMacro = { choice, player_id: playerId, ts: this.now() };
    this._emit('next_macro', { player_id: playerId, choice });
    let advance = null;
    if (choice === 'retreat') {
      if (this.phase !== 'ended') {
        this.run.outcome = this.run.outcome || 'retreated';
        this._setPhase('ended');
        this._emit('run_ended', { run_id: this.run.id, reason: 'retreat' });
        advance = { action: 'ended', reason: 'retreat' };
      } else {
        advance = { action: 'already_ended' };
      }
    } else if (this.phase === 'debrief') {
      // N1 Nido-hub gate: if unlocked, route to nido hub before advancing.
      // checkNidoUnlock checks env NIDO_UNLOCKED=true OR meta.nido_unlocked.
      if (checkNidoUnlock({ meta: { nido_unlocked: this._nidoUnlocked } })) {
        this._setPhase('nido');
        advance = { action: 'nido' };
      } else {
        advance = this.advanceScenarioOrEnd();
      }
    } else {
      advance = { action: 'noop_post_advance' };
    }
    return { choice, phase: this.phase, run_state: this.run, advance };
  }

  /**
   * N1 Nido-hub — host leaves the hub and starts the next mission.
   * Requires phase === 'nido'. Host-only. Delegates to advanceScenarioOrEnd()
   * which moves phase to world_setup (or ended if stack exhausted).
   *
   * @param playerId — submitting player (must equal hostId)
   * @param hostId — current host player id (host-only gate)
   * @returns { phase, advance, run_state }
   */
  startMissionFromNido(playerId, { hostId } = {}) {
    if (hostId && playerId !== hostId) throw new Error('host_only');
    if (this.phase !== 'nido') throw new Error('not_in_nido');
    const advance = this.advanceScenarioOrEnd();
    return { phase: this.phase, advance, run_state: this.run };
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
   *
   * 2026-05-15 Bundle C follow-up — optional `debriefPayload` carries
   * 4-layer profilo psicologico (sentience + conviction + ennea per actor)
   * computed by combat resolver via vcScoring.buildVcSnapshot. Attached to
   * run.debrief for broadcastCoopState → phone DebriefView reveal parity
   * with TV. Back-compat: default null → no payload, phone hides labels.
   *
   * Expected shape (all optional):
   *   debriefPayload.per_actor[uid] = {
   *     sentience_tier: "T0"-"T6",
   *     conviction_axis: {utility, liberty, morality},
   *     ennea_archetype: "<canonical name>"
   *   }
   */
  endCombat({
    outcome = 'victory',
    survivors = [],
    xpEarned = 0,
    debriefPayload = null,
    sistemaObservations = null,
    recruitCandidates = null,
  } = {}) {
    if (this.phase !== 'combat') throw new Error('not_in_combat');
    this.run.outcome = outcome;
    this.run.survivors = Array.isArray(survivors) ? survivors : [];
    this.run.partyXp += xpEarned;
    if (debriefPayload && typeof debriefPayload === 'object') {
      this.run.debrief = debriefPayload;
    }
    // Task 5 debrief-recruit producer: thread recruit_candidates onto run.debrief
    // so it rides the existing debrief_payload broadcast to phones alongside
    // per_actor. Only stored when a non-empty array is supplied. Back-compat:
    // absent or empty -> no change to run.debrief.
    if (Array.isArray(recruitCandidates) && recruitCandidates.length > 0) {
      this.run.debrief = { ...(this.run.debrief || {}), recruit_candidates: recruitCandidates };
    }
    const emitPayload = { outcome, survivors, xp: xpEarned };
    if (debriefPayload && typeof debriefPayload === 'object') {
      emitPayload.debrief = debriefPayload;
    }
    this._emit('combat_ended', emitPayload);
    this._setPhase('debrief');
    // CAMP-2 best-effort SistemaState accumulation. Folds the per-encounter
    // slim-delta { roster, kills } into units_observed keyed by run.id. Runs
    // detached (Promise.resolve().then) + .catch so a store failure NEVER
    // blocks or throws into the combat-end path. No observations -> no-op.
    if (sistemaObservations && this.run && this.run.id) {
      const store = this._getSistemaStore();
      const runId = this.run.id;
      Promise.resolve()
        .then(async () => {
          const prior = await store.get(runId);
          const next = foldObservations((prior && prior.units_observed) || {}, sistemaObservations);
          await store.upsert(runId, next);
        })
        .catch((err) =>
          console.warn('[coop] sistema accumulate failed (best-effort):', err.message),
        );
    }
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
    this.sessionId = null;
    this.matingVotes.clear();
    this.routeVotes.clear();
    this.routeCandidates = null;
    this.formPulses.clear();
    this.revealAcks.clear();
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
