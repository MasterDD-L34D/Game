// M16 — coopOrchestrator skeleton (ADR-2026-04-26-m15 / coop-mvp-spec.md).
// Phase machine + character creation + world setup + combat wiring + debrief.
// Skeleton only: interface defined, wire implementations M17-M19.

'use strict';

const crypto = require('crypto');
const { foldObservations } = require('../ai/sistemaStateAccumulator');
const { createSistemaStateStore } = require('../ai/sistemaStateStore');
const { createRosterStore } = require('../campaign/rosterStore');
const { checkNidoUnlock } = require('../../routes/sessionHelpers');
const {
  emergeBrancoTraitFromPulses,
  resolveEmergenceThreshold,
  emergePlayerMinorTrait,
  isFormPulseTraitV2Enabled,
  rollRandomFormAxes,
} = require('../identity/brancoTraitEmergence');
const { emergeIdentity, emitCreatureNamed } = require('../identity/identityService');
const { aggregateFormPulses } = require('../formPulseVc');
const consentSM = require('./lethalConsent');
const {
  computeImprintBiomeWeights,
  topBiome,
  brancoTendencyHint,
  IMPRINT_AXES,
  IMPRINT_AXIS_DEFAULTS,
  isValidAxisValue,
} = require('../imprint/imprintBiomeWeights');
const { emergeImprintTrait, isImprintTraitGrantEnabled } = require('../imprint/imprintTraitGrant');

// CAMP-1/CAMP-2 - run.id is the SistemaState persistence key (server writes
// SistemaState under run.id; Godot client keys CampaignState.campaign_id on
// it). The legacy `run_${Date.now().toString(36)}` collided when two runs
// were created in the same millisecond, causing cross-run learning bleed.
// crypto.randomUUID() is collision-resistant; the `run_` prefix is preserved.
function newRunId() {
  return `run_${crypto.randomUUID()}`;
}

// M-2 (#2679 residual) -- PROPOSED lifecycle-stage proxy for the coop run.
// QF2 ratified the MODEL (auto da lifecycle: Hatchling anonima -> Juvenile nome
// -> Apex nome+MBTI reveal -> Legacy) but the creature lifecycle stage is not a
// coded field yet (identityService header). In a coop run the progression proxy
// is: >=1 scenario cleared -> juvenile; run completed -> apex. Legacy stays out
// of run scope (lineage/death, SPEC-J/M-3). Mapping = PROPOSED, ratify N=40/MA3
// alongside the name-pool content.
function proposedStageByProgression(cleared, runComplete) {
  if (runComplete) return 'apex';
  return cleared >= 1 ? 'juvenile' : 'hatchling';
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
    chronicleBaseDir = null,
    namePool = null,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    randomFn = Math.random,
  } = {}) {
    if (!roomCode) throw new Error('room_code_required');
    this.roomCode = roomCode;
    this.hostId = hostId || null;
    this.now = now;
    // Form-Pulse trait v2 Piece 3 -- RNG seam for the timeout random-fill (DI; default
    // Math.random, tests inject a deterministic fn). The roll is persisted into formPulses
    // (frozen) so reconnect/snapshot stay consistent despite the real-random source.
    this._random = typeof randomFn === 'function' ? randomFn : Math.random;
    // SPEC-J sez.5 trigger-(a) -- wall-clock scheduler for the automatic
    // lethal-consent timeout (DI seam, default globals; tests inject a fake).
    // Pure helpers stay time-source-free; only the auto-timer needs real time.
    this._setTimeoutFn = typeof setTimeoutFn === 'function' ? setTimeoutFn : setTimeout;
    this._clearTimeoutFn = typeof clearTimeoutFn === 'function' ? clearTimeoutFn : clearTimeout;
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
    // SPEC-K K-02 — co-op world lock-in. When the host PROPOSES the world (rich
    // params it computed: biome/seed/form_axes) the params are stashed here so a
    // later device-quorum (worldTally.all_connected_accepted) can auto-commit
    // confirmWorld() WITHOUT a host action. null = legacy host-confirm path.
    this.proposedWorld = null;
    this.missionReadyVotes = new Map(); // player_id → {ready,ts} (SPEC-K K-05 nido next-mission quorum)
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
    // SPEC-M (ADR-2026-06-07 device-authority) — per-player onboarding choices.
    // player_id -> normalized choice. Readiness-gated advance (mirror characters).
    this.onboardingChoices = new Map();
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
    // Form-Pulse trait v2 Piece 2: per-player minor trait tracked for idempotent re-derive.
    this.playerMinorTraits = new Map(); // player_id → minor trait_id
    // #2674 -- shared branco trait emergent from the aggregated Form Pulse;
    // tracked so re-submits swap cleanly. null until all_ready emerges.
    this.emergentBrancoTrait = null;
    // M-2 (#2679 residual) -- emergent identity per creature (unit_id ->
    // { stage, anonymous, name, mbti_reveal }). ADDITIVE layer: the player's
    // character.name is never overwritten (QF2-C hybrid compatible). Persists
    // across scenario advances (the name is earned, not re-rolled); cleared on
    // run start. chronicleBaseDir/namePool = DI seams (tests; prod defaults).
    this.creatureIdentities = new Map();
    this.chronicleBaseDir = chronicleBaseDir || null;
    this.namePool = Array.isArray(namePool) ? namePool : null;
    // C2-imprint (ratified L'Impronta affinity 6.1-A + additive beat 6.2-A) -- NON-gating
    // transient side-collection (mirror formPulses; no PHASES enum change). Host opens the
    // beat; the 4 body-part axes are round-robin assigned to the N connected players and
    // marked per-device; on all-4-axes-marked the cosmetic biome-affinity hint is stamped.
    // Flag-gated at the open path (IMPRINT_BEAT_ENABLED): with the beat never opened these
    // stay empty/null -> band-neutral. NEVER binds a biome (route-canon) or feeds combat.
    this.imprintMarks = new Map(); // axis -> { value, by, ts }
    this.imprintAssignment = null; // { player_id: [axis,...] } | null (set on open)
    this.imprintOpen = false;
    this.brancoBiomeHint = null; // { leans_toward, weights } | null (stamped on quorum)
    // D6 (master-dd ratify 2026-06-30): the resolved team imprint 4-tuple, stamped at
    // hint time. Read by the branco-trait emergence (stacking B: imprint feeds the single
    // slot as a Form-Pulse fallback). null until the beat resolves; flag-gated downstream.
    this.imprintTuple = null;
    // C2-imprint deadline (master-dd 2026-06-23): WARNING-ONLY timer. On fire the beat
    // STAYS open + flags `timeout_warning` so the host TV can prompt force/wait -- it does
    // NOT silently auto-default (the rejected option). Cleared on every resolve/reset.
    this.imprintTimeoutWarning = false;
    this._imprintTimer = null;
    // Form-Pulse trait v2 Piece 3: 2-stage timeout (warn -> auto random-fill) timer handles +
    // the warn flag (mirror imprintTimeoutWarning; reset on every run transition so it never
    // bleeds a stale `true` into a fresh form_pulse phase -- harsh-review P2 #2992).
    this._formPulseWarnTimer = null;
    this._formPulseAutoTimer = null;
    this.formPulseTimeoutWarning = false;
    this.log = [];
    this._listeners = new Set();
    // W5-bb (cross-repo Godot v2 mirror) — world enricher service injection.
    // Default lazy-loads the canonical service module on first use.
    this._worldEnricher = worldEnricher;
    this.enrichedWorld = null; // populated by confirmWorld() with rich schema
    // PR-1 §22 coop-WS surface — combat session id (POST /api/session/start)
    // linked back via coopStore.linkSession so phase_change can surface it.
    this.sessionId = null;
    // SPEC-J sez.5 -- per-player lethal-consent round (pure state in lethalConsent.js).
    // null = no round open. Set by openLethalConsent; the anonymous snapshot is
    // what the coop transport broadcasts (F5: no per-player roster).
    this.lethalConsent = null;
    // SPEC-J sez.5 trigger-(a) -- handle of the one-shot auto-timeout timer for
    // the open round (null = none scheduled). Cleared on any resolution / reset.
    this._lethalConsentTimer = null;
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
    this.proposedWorld = null; // SPEC-K K-02 — drop stale world proposal
    this.missionReadyVotes.clear();
    this.sessionId = null;
    this.matingVotes.clear();
    this.routeVotes.clear();
    this.routeCandidates = null;
    this.debriefChoices.clear();
    this.revealAcks.clear();
    this.formPulses.clear();
    this.playerMinorTraits.clear();
    this._clearFormPulseTimer();
    this.formPulseTimeoutWarning = false;
    this.emergentBrancoTrait = null;
    this.creatureIdentities.clear();
    this.onboardingChoice = null;
    this.onboardingChoices.clear();
    this._resetImprint();
    this._clearLethalConsentTimer(); // SPEC-J: drop any armed auto-timeout
    this.lethalConsent = null; // SPEC-J: never carry a consent round across runs
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
    this.proposedWorld = null; // SPEC-K K-02 — drop stale world proposal
    this.missionReadyVotes.clear();
    this.sessionId = null;
    this.matingVotes.clear();
    this.routeVotes.clear();
    this.routeCandidates = null;
    this.debriefChoices.clear();
    this.revealAcks.clear();
    this.formPulses.clear();
    this.playerMinorTraits.clear();
    this._clearFormPulseTimer();
    this.formPulseTimeoutWarning = false;
    this.emergentBrancoTrait = null;
    this.creatureIdentities.clear();
    this.onboardingChoice = null;
    this.onboardingChoices.clear();
    this._resetImprint();
    this._clearLethalConsentTimer(); // SPEC-J: drop any armed auto-timeout
    this.lethalConsent = null; // SPEC-J: never carry a consent round across runs
    this._setPhase('onboarding');
    this._emit('run_started', { run_id: this.run.id, with_onboarding: true });
    return this.run;
  }

  /**
   * Onboarding identity choice. Two modes (SPEC-M, ADR-2026-06-07 device-authority):
   *  - **per-player** (`allPlayerIds` provided): each device player submits its OWN
   *    choice; stored in `onboardingChoices` Map; auto-advances onboarding ->
   *    character_creation ONLY when ALL expected players have submitted (readiness gate).
   *    No host gate -- each player owns its identity input.
   *  - **legacy single-choice** (no `allPlayerIds`): host submits one choice for the
   *    branco and it advances immediately; host-only enforced. Backward-compatible with
   *    the 2026-05-06 narrative onboarding port (current wsSession caller) until the Godot
   *    client is updated to send per-player onboarding_choice.
   * `onboardingChoice` (singular) mirrors the last submitter for legacy consumers.
   *
   * @param playerId — submitting player
   * @param choice — { option_key, trait_id, label, narrative, auto_selected }
   * @param opts.allPlayerIds — expected device players (enables per-player readiness)
   * @param opts.hostId — host player id (legacy host-only gate when no allPlayerIds)
   *
   * SPEC-K K-01 design-call DC#2 (RESOLVED 2026-06-20): the per-player-vs-aggregate
   * AUTHORITY for onboarding is deferred to SPEC-A/B (K-spec matrix line 129), NOT a
   * K migration. The per-player device branch already exists here (pass allPlayerIds);
   * the host-only path is the explicit legacy fallback until SPEC-A/B rules the model
   * and the Godot client sends per-player onboarding_choice. Not a K build gap.
   */
  submitOnboardingChoice(playerId, choice, { allPlayerIds = [], hostId } = {}) {
    if (this.phase !== 'onboarding') throw new Error('not_in_onboarding');
    if (!playerId) throw new Error('player_id_required');
    const expected = new Set((Array.isArray(allPlayerIds) ? allPlayerIds : []).filter(Boolean));
    const perPlayer = expected.size > 0;
    // Legacy single-choice mode: host-only gate. Per-player mode: any expected player.
    if (!perPlayer && hostId && playerId !== hostId) throw new Error('host_only');
    if (!choice || !choice.option_key || !choice.trait_id) {
      throw new Error('choice_invalid');
    }
    // Per-player mode: reject a ghost client not in the current roster.
    if (perPlayer && !expected.has(playerId)) throw new Error('player_not_in_room');
    const normalized = {
      option_key: String(choice.option_key),
      trait_id: String(choice.trait_id),
      label: choice.label ? String(choice.label) : null,
      narrative: choice.narrative ? String(choice.narrative) : null,
      auto_selected: Boolean(choice.auto_selected),
      submitted_by: playerId,
      submitted_at: this.now(),
    };
    this.onboardingChoices.set(playerId, normalized);
    this.onboardingChoice = normalized; // legacy mirror (last submitter)
    this._emit('onboarding_chosen', normalized);
    if (perPlayer) {
      const allReady = Array.from(expected).every((pid) => this.onboardingChoices.has(pid));
      if (allReady) this._setPhase('character_creation');
    } else {
      // Legacy: a single choice for the branco advances immediately.
      this._setPhase('character_creation');
    }
    return normalized;
  }

  /**
   * Per-player onboarding ready-state snapshot for broadcast (SPEC-M).
   * Mirrors characterReadyList: one entry per expected device player.
   */
  onboardingReadyList(allPlayerIds = []) {
    return (Array.isArray(allPlayerIds) ? allPlayerIds : []).map((pid) => {
      const ch = this.onboardingChoices.get(pid);
      return {
        player_id: pid,
        option_key: ch?.option_key || null,
        trait_id: ch?.trait_id || null,
        ready: Boolean(ch),
      };
    });
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
    // 2026-06-21 OD-024 ai-station -- sentience interoception trait grant.
    // Gate-5 closure: append the RFC interoception gateway traits when the
    // species sentience_index qualifies (>= T1). Flag-gated OFF
    // (SENTIENCE_INTEROCEPTION_GRANT_ENABLED) -> band-neutral no-op by default
    // until master-dd flips it post N=40. See services/sentience/
    // sentienceInteroceptionGrant.js + docs/planning scope doc.
    try {
      // eslint-disable-next-line global-require
      const {
        applySentienceInteroceptionGrant,
      } = require('../sentience/sentienceInteroceptionGrant');
      const granted = applySentienceInteroceptionGrant({
        species_id: spec.species_id,
        traits: baseTraits,
      });
      if (Array.isArray(granted?.traits)) {
        baseTraits = granted.traits;
      }
    } catch {
      // sentience grant helper optional -- non blocca character submit.
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
   * SPEC-K K-02: under WORLD_CONFIRM_QUORUM_ENABLED this is the committing
   * primitive the device quorum auto-fires (see tryAutoConfirmWorld); the host
   * CTA that calls it directly is the marked DEV_FALLBACK / anti-deadlock path,
   * NOT the production commit. Flag OFF = legacy host-confirm.
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
          // #2679 -- fall back to the aggregated form-pulse creature axes when the
          // caller passes none (Godot confirm_world omits form_axes); lets the
          // companion voice reflect the branco lean.
          formAxes:
            formAxes && Object.keys(formAxes).length
              ? formAxes
              : aggregateFormPulses(this.formPulses),
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
    this.proposedWorld = null; // committed — drop any pending proposal
    return {
      scenario_id: sid,
      enriched_world: enrichedWorld,
    };
  }

  /**
   * SPEC-K K-02 — co-op world lock-in (host proposes, device quorum commits).
   * In co-op (>=1 connected voter) the host CTA PROPOSES the world: the rich
   * params it computed are stashed and the device vote opens, but the phase
   * does NOT advance — confirmWorld fires only when worldTally reaches
   * all_connected_accepted (see tryAutoConfirmWorld). Solo/dev (zero connected
   * voters) OR `force` (host anti-deadlock) commit immediately = legacy
   * behavior. The host CTA is the marked DEV_FALLBACK; production commit is the
   * device quorum (spec sez.6.3 / matrix 131-132 / criterion 9.4).
   *
   * @param params — { scenarioId, biomeId, formAxes, runSeed, trainerCanonical }
   * @param connectedQuorumPids — host-excluded connected voter ids (route helper)
   * @param force — host force-confirm (skip quorum, anti-deadlock fallback)
   * @returns { committed:true, ...confirmResult } | { committed:false, proposed:true, scenario_id }
   */
  proposeWorld(params = {}, { connectedQuorumPids = [], force = false } = {}) {
    if (this.phase !== 'world_setup') throw new Error('not_in_world_setup');
    const voters = (connectedQuorumPids || []).filter(Boolean);
    if (force || voters.length === 0) {
      // immediate commit: solo/dev (no device voters) OR host force-confirm.
      return { committed: true, ...this.confirmWorld(params) };
    }
    // co-op: stash proposed params + open the device vote (no phase change).
    // Codex P2 #2879 — reset prior votes so the quorum applies to THIS proposal
    // only. Without this, an accept cast against an earlier proposal would carry
    // over and let a re-proposed (different) world auto-commit without re-vote.
    this.worldVotes.clear();
    this.proposedWorld = { ...params };
    const sid = params.scenarioId || this.run?.scenarioStack?.[this.run.currentIndex] || null;
    this._emit('world_proposed', { scenario_id: sid, biome_id: params.biomeId || null });
    return { committed: false, proposed: true, scenario_id: sid };
  }

  /**
   * SPEC-K K-02 — auto-commit a PROPOSED world once the device vote reaches
   * all_connected_accepted. No-op (returns null) when no world is proposed
   * (legacy host-confirm path) OR quorum not yet met, so callers may invoke it
   * after every world vote / disconnect unconditionally (mirror of the K-05
   * mission-ready auto-advance). Re-fires confirmWorld with the stashed params.
   *
   * @returns confirmWorld result (phase -> combat) | null
   */
  tryAutoConfirmWorld({ allPlayerIds = [], connectedPlayerIds } = {}) {
    if (!this.proposedWorld) return null;
    if (this.phase !== 'world_setup') return null;
    const tally = this.worldTally(allPlayerIds, connectedPlayerIds);
    if (!tally.all_connected_accepted) return null;
    const params = this.proposedWorld;
    this.proposedWorld = null;
    return this.confirmWorld(params);
  }

  /**
   * M18 — Player casts vote on proposed scenario. accept=true/false.
   * Host remains arbiter for the LEGACY path; under WORLD_CONFIRM_QUORUM_ENABLED
   * the device quorum auto-commits via tryAutoConfirmWorld (SPEC-K K-02).
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
    const emergent = allReady ? this._applyBrancoTraitEmergence() : null;
    return {
      ready_count: readyCount,
      total,
      all_ready: allReady,
      submitted: Array.from(this.formPulses.keys()),
      emergent_branco_trait: emergent,
    };
  }

  /**
   * #2674 -- emerge the shared branco trait from this.formPulses and apply it to
   * every submitted character. Mechanism-only (threshold + mapping stay PROPOSED).
   * Idempotent: re-emergence with the same trait is a no-op; a changed dominant
   * axis swaps (strip prior tracked id, add new). Player-chosen traits untouched.
   * NB only fires for canonical creature-axis input; phone MBTI axes yield no
   * emergent (axis-vocabulary contract = separate issue).
   */
  _applyBrancoTraitEmergence() {
    // Form-Pulse trait v2 Piece 1: the threshold is flag-resolved (0 when v2 ON = always
    // emerge, else 0.30 = band-neutral). The mapping stays PROPOSED (N=40).
    const fromPulses = emergeBrancoTraitFromPulses(this.formPulses, {
      threshold: resolveEmergenceThreshold(),
    });
    // D6 stacking B (master-dd ratify 2026-06-30): the imprint FEEDS the same single
    // branco-trait slot. Form-Pulse takes precedence; the imprint candidate fills the
    // slot ONLY when Form-Pulse yields nothing (dominance = Form-Pulse > imprint;
    // PROPOSED, ratify via N=40). Flag-gated -> OFF = byte-identical (fromPulses only).
    const next =
      fromPulses || (isImprintTraitGrantEnabled() ? emergeImprintTrait(this.imprintTuple) : null);
    const prevId = this.emergentBrancoTrait && this.emergentBrancoTrait.trait_id;
    const nextId = next && next.trait_id;
    if (prevId !== nextId) {
      if (prevId) {
        for (const ch of this.characters.values()) {
          if (Array.isArray(ch.traits)) {
            const i = ch.traits.indexOf(prevId);
            if (i !== -1) ch.traits.splice(i, 1);
          }
        }
      }
      if (nextId) {
        for (const ch of this.characters.values()) {
          if (!Array.isArray(ch.traits)) ch.traits = [];
          if (!ch.traits.includes(nextId)) ch.traits.push(nextId);
        }
        this._emit('branco_trait_emerged', { ...next });
      }
    }
    this.emergentBrancoTrait = next || null;
    // Form-Pulse trait v2 Piece 2: per-player minor traits re-derive from each player's own
    // bars + the branco axis (flag-gated; OFF = no minor traits, band-neutral).
    if (isFormPulseTraitV2Enabled()) this._applyPlayerMinorTraits();
    return next || null;
  }

  /**
   * Form-Pulse trait v2 -- Piece 2. Grant each player a per-creature MINOR trait derived from
   * THEIR OWN bars via the COMPLEMENT rule (emergePlayerMinorTrait): own dominant axis, or the
   * 2nd-strongest if it collides with the branco axis. Idempotent: re-derive strips the prior
   * tracked minor per player then adds the new one. Branco + player-chosen traits untouched.
   * Only invoked when the v2 flag is ON (call site guards).
   */
  _applyPlayerMinorTraits() {
    const brancoAxis = this.emergentBrancoTrait && this.emergentBrancoTrait.axis;
    for (const [pid, ch] of this.characters.entries()) {
      if (!ch) continue;
      if (!Array.isArray(ch.traits)) ch.traits = [];
      const prev = this.playerMinorTraits.get(pid);
      if (prev) {
        const i = ch.traits.indexOf(prev);
        if (i !== -1) ch.traits.splice(i, 1);
      }
      const fp = this.formPulses.get(pid);
      const minor = fp ? emergePlayerMinorTrait(fp.axes, brancoAxis) : null;
      const id = minor && minor.trait_id;
      if (id) {
        if (!ch.traits.includes(id)) ch.traits.push(id);
        this.playerMinorTraits.set(pid, id);
      } else {
        this.playerMinorTraits.delete(pid);
      }
    }
  }

  /**
   * Codex #3083 P2: empty the single branco-trait slot + per-player minor traits.
   * The party PERSISTS across scenarios (advanceScenarioOrEnd keeps `characters`),
   * so nulling `emergentBrancoTrait` / clearing `playerMinorTraits` alone left the
   * granted trait id in each character's `traits` array. The next slot source
   * (Form-Pulse OR the D6 imprint fallback) then ran with prevId=null and ADDED a
   * second branco trait. Strip the tracked ids from characters first, then clear
   * the trackers, so the slot is truly empty for the next scenario.
   */
  _clearEmergentTraits() {
    const brancoId = this.emergentBrancoTrait && this.emergentBrancoTrait.trait_id;
    for (const [pid, ch] of this.characters.entries()) {
      if (!ch || !Array.isArray(ch.traits)) continue;
      if (brancoId) {
        const i = ch.traits.indexOf(brancoId);
        if (i !== -1) ch.traits.splice(i, 1);
      }
      const minorId = this.playerMinorTraits.get(pid);
      if (minorId) {
        const j = ch.traits.indexOf(minorId);
        if (j !== -1) ch.traits.splice(j, 1);
      }
    }
    this.emergentBrancoTrait = null;
    this.playerMinorTraits.clear();
  }

  /**
   * Form-Pulse trait v2 -- Piece 3. Roll random bars for any EXPECTED player who never
   * submitted (the timeout anti-deadlock), PERSIST them into formPulses (frozen roll ->
   * reconnect-safe), then re-run the branco emergence (+ minor traits). Returns the list of
   * auto-filled player ids ([] = nothing to do). Flag-gated at the call site (v2 only).
   */
  autoFillFormPulses(expectedIds = []) {
    const filled = [];
    for (const pid of Array.isArray(expectedIds) ? expectedIds : []) {
      if (!pid || this.formPulses.has(pid)) continue;
      this.formPulses.set(pid, {
        axes: rollRandomFormAxes(this._random),
        ts: this.now(),
        auto: true,
      });
      filled.push(pid);
    }
    if (filled.length) {
      this._applyBrancoTraitEmergence();
      this._emit('form_pulse_auto_filled', { players: filled });
    }
    return filled;
  }

  // The expected ids that have NOT yet submitted a form pulse.
  _pendingFormPulses(expectedIds = []) {
    return (Array.isArray(expectedIds) ? expectedIds : []).filter(
      (pid) => pid && !this.formPulses.has(pid),
    );
  }

  // True iff every expected id has submitted (no pending).
  _allFormPulsesReady(expectedIds = []) {
    return this._pendingFormPulses(expectedIds).length === 0;
  }

  _clearFormPulseTimer() {
    if (this._formPulseWarnTimer) {
      this._clearTimeoutFn(this._formPulseWarnTimer);
      this._formPulseWarnTimer = null;
    }
    if (this._formPulseAutoTimer) {
      this._clearTimeoutFn(this._formPulseAutoTimer);
      this._formPulseAutoTimer = null;
    }
  }

  /**
   * Form-Pulse trait v2 -- Piece 3. Arm the 2-stage anti-deadlock timer (mirror
   * openLethalConsent: DI _setTimeoutFn + unref). warnMs -> non-blocking warning broadcast
   * (devices nudge the laggards, beat stays open); autoMs -> roll random bars for the still-
   * pending players + re-run emergence. Both fires no-op once everyone has submitted. The
   * transport passes onWarn/onAuto to broadcast. Caller arms this only when the v2 flag is ON.
   */
  armFormPulseTimer(expectedIds = [], { warnMs, autoMs, onWarn, onAuto } = {}) {
    this._clearFormPulseTimer();
    const ids = (Array.isArray(expectedIds) ? expectedIds : []).filter(Boolean);
    if (ids.length === 0) return;
    if (Number.isFinite(warnMs) && warnMs > 0) {
      const wh = this._setTimeoutFn(() => {
        this._formPulseWarnTimer = null;
        if (this._allFormPulsesReady(ids)) return;
        const pending = this._pendingFormPulses(ids);
        this.formPulseTimeoutWarning = true;
        this._emit('form_pulse_timeout_warning', { pending });
        if (typeof onWarn === 'function') {
          try {
            onWarn(pending);
          } catch (_e) {
            /* never crash the timer callback */
          }
        }
      }, warnMs);
      if (wh && typeof wh.unref === 'function') wh.unref();
      this._formPulseWarnTimer = wh;
    }
    if (Number.isFinite(autoMs) && autoMs > 0) {
      const ah = this._setTimeoutFn(() => {
        this._formPulseAutoTimer = null;
        if (this._allFormPulsesReady(ids)) return;
        const filled = this.autoFillFormPulses(ids);
        if (typeof onAuto === 'function') {
          try {
            onAuto(filled);
          } catch (_e) {
            /* never crash the timer callback */
          }
        }
      }, autoMs);
      if (ah && typeof ah.unref === 'function') ah.unref();
      this._formPulseAutoTimer = ah;
    }
  }

  /**
   * M-2 (#2679 residual) -- name-emergence call-site, mirror of the #2680
   * branco-trait pattern. Called on run progression (advanceScenarioOrEnd),
   * NOT on form_pulse: QF2 keeps the Hatchling anonymous at creation; the
   * name is earned by surviving scenarios. Chronicle events key on run.id
   * (the coop-side id where formPulses/characters live -- the #2674 gap).
   *
   * Idempotent: emits (chronicle `creature_named` + WS `creature_named`)
   * only on identity TRANSITIONS -- anonymous->named (juvenile) and
   * mbti_reveal upgrade (apex). Same-stage re-entry is a no-op; the name is
   * deterministic per unit id (stable across advances). Whole-branco stage
   * advance (no survivor gating) = part of the PROPOSED mapping.
   *
   * @param stage — lifecycle stage from proposedStageByProgression
   * @returns array of emitted { actor_id, player_id, name, stage, mbti_reveal }
   */
  _applyNameEmergence(stage) {
    if (!this.run) return [];
    const emitted = [];
    for (const ch of this.characters.values()) {
      const unitId = ch.unit_id || `pg_${ch.player_id}`;
      const prev = this.creatureIdentities.get(unitId) || null;
      const identity = emergeIdentity(
        { id: unitId, species: ch.species_id },
        this.namePool ? { stage, pool: this.namePool } : { stage },
      );
      this.creatureIdentities.set(unitId, identity);
      const named = !identity.anonymous && Boolean(identity.name);
      const becameNamed = named && (!prev || prev.anonymous || !prev.name);
      const revealUpgrade = named && prev && !prev.mbti_reveal && identity.mbti_reveal;
      if (!becameNamed && !revealUpgrade) continue;
      emitCreatureNamed(
        this.run.id,
        { actor_id: unitId, identity },
        { baseDir: this.chronicleBaseDir },
      );
      const evt = {
        actor_id: unitId,
        player_id: ch.player_id,
        name: identity.name,
        stage: identity.stage,
        mbti_reveal: identity.mbti_reveal,
      };
      this._emit('creature_named', evt);
      emitted.push(evt);
    }
    return emitted;
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
   *
   * SPEC-K K-02 design property (mirror of missionReadyTally / B-NEW-1): the
   * connected-only quorum is computed over the CURRENT connected set, so a
   * player who casts `reject` and then DISCONNECTS no longer counts toward
   * `all_connected_accepted` (their stored reject survives in `reject`/`per_player`
   * but not in `connected_reject`). A rejecter can therefore abandon their veto
   * by leaving — intentional, identical to how a not-ready peer dropping
   * completes the Nido readiness quorum. Consumers must read `connected_*`, not
   * the raw `reject`, to reason about advance.
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
   *
   * P1-B (PR #2597 review): a disconnected player's vote PERSISTS in routeVotes
   * (mirrors mating) until the next run-advance clears it. The connected_* fields
   * self-heal via connectedPlayerIds, but the raw `tallies` still count a departed
   * voter -- intentional, to survive a brief reconnect.
   *
   * SPEC-K K-01 DC#5 RATIFIED 2026-06-20 (master-dd): KEEP persist (do NOT prune
   * on disconnect) so a player who drops + reconnects with the same token keeps
   * their choice. Reconnect-preserves-changes is locked by
   * tests/api/coopReconnectPreservesVotes.test.js (orchestrator persist + WS e2e
   * disconnect->reconnect). Any future "prune on disconnect" MUST keep that test
   * green or it breaks the reconnect contract.
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

  // === SPEC-J sez.5 -- lethal consent (per-player device confirm, NOT quorum) ===

  /** SPEC-J sez.5 trigger-(a) -- cancel the pending auto-timeout timer, if any. */
  _clearLethalConsentTimer() {
    if (this._lethalConsentTimer) {
      this._clearTimeoutFn(this._lethalConsentTimer);
      this._lethalConsentTimer = null;
    }
  }

  /**
   * Open a lethal-consent round for the at-risk players (those whose creature
   * participates in the lethal mission, SPEC-K 6.4). Host-initiated (the route
   * layer authorizes). Emits `lethal_consent_open` with the anonymous snapshot.
   *
   * SPEC-J sez.5 trigger-(a): for a `pending` round (>=1 at-risk player) this
   * also arms a one-shot wall-clock timer at the round's `timeout_ms`. When it
   * fires it auto-resolves the round to `timeout_soft` (NON parte lethal) with no
   * host action -- the spec's "device online ma nessuna risposta -> timeout". The
   * optional `onTimeout(snapshot, outcome)` callback lets the transport broadcast
   * the resolution; it fires ONLY from the timer path (manual confirm/cancel
   * paths broadcast themselves, so no double-broadcast). The timeout VALUE is a
   * master-dd design-call (lethalConsent.DEFAULT_TIMEOUT_MS, PROPOSED); this only
   * wires the firing.
   * @returns the anonymous snapshot (F5: counts only).
   */
  openLethalConsent(atRiskPlayerIds = [], { timeoutMs, onTimeout } = {}) {
    this._clearLethalConsentTimer();
    this.lethalConsent = consentSM.open(atRiskPlayerIds, { now: this.now(), timeoutMs });
    const snap = consentSM.snapshot(this.lethalConsent);
    this._emit('lethal_consent_open', snap);
    if (this.lethalConsent.status === 'pending' && this.lethalConsent.timeout_ms > 0) {
      // Exact deadline captured at schedule time -> passed to the sweep as `now`
      // so a sub-ms-early libuv fire still satisfies the elapsed check (see
      // evalLethalConsentTimeout). Independent of state at fire time (which may
      // have been reset to null by a run advance/reset).
      const deadline = this.lethalConsent.opened_at + this.lethalConsent.timeout_ms;
      const handle = this._setTimeoutFn(() => {
        this._lethalConsentTimer = null;
        // Re-validate via the shared sweep: only acts on a still-`pending`
        // round, so a granted/already-soft round (race) is a no-op.
        const before = this.lethalConsent && this.lethalConsent.status;
        const resolved = this.evalLethalConsentTimeout({ now: deadline });
        if (
          typeof onTimeout === 'function' &&
          before === 'pending' &&
          this.lethalConsent &&
          this.lethalConsent.status !== 'pending'
        ) {
          // State is already resolved; a transport failure here must never
          // crash the timer callback (unhandled throw in setTimeout = process
          // crash). Swallow like _emit does.
          try {
            onTimeout(resolved, consentSM.outcome(this.lethalConsent));
          } catch {
            // swallow transport error
          }
        }
      }, this.lethalConsent.timeout_ms);
      // Never let the auto-timeout keep the process alive (tests, graceful exit).
      if (handle && typeof handle.unref === 'function') handle.unref();
      this._lethalConsentTimer = handle;
    }
    return snap;
  }

  /**
   * An at-risk player confirms (WS intent, socket-bound identity). Emits
   * `lethal_consent_confirmed`; when the round resolves to `granted` it also
   * emits `lethal_consent_resolved`. Throws when no round is open.
   * @returns the anonymous snapshot.
   */
  confirmLethalConsent(playerId) {
    if (!this.lethalConsent) throw new Error('lethal_consent_not_open');
    const before = this.lethalConsent.status;
    this.lethalConsent = consentSM.confirm(this.lethalConsent, playerId, { now: this.now() });
    const snap = consentSM.snapshot(this.lethalConsent);
    this._emit('lethal_consent_confirmed', snap);
    if (before === 'pending' && this.lethalConsent.status === 'granted') {
      this._clearLethalConsentTimer(); // round resolved -> auto-timeout moot
      this._emit('lethal_consent_resolved', { outcome: 'granted', snapshot: snap });
    }
    return snap;
  }

  /**
   * Anti-deadlock sweep (sez.5): resolve a still-pending round to soft when the
   * timeout has elapsed (post delivery-receipt) or delivery failed. Emits
   * `lethal_consent_resolved` on a soft resolution. Safe to call repeatedly.
   *
   * `now` override: the auto-timer (sez.5 trigger-a) passes the exact round
   * deadline (opened_at + timeout_ms). The firing is decided by libuv's
   * monotonic clock while elapsed is measured against Date.now() -- the two can
   * disagree by ~1ms, so a plain this.now() re-check could read elapsed as
   * `timeout_ms - 1` and leave the round stuck pending forever (the "unattended
   * fallback" silently fails). Pinning `now` to the deadline makes the timer's
   * resolution deterministic. Defaults to this.now() for the manual paths.
   * @returns the anonymous snapshot.
   */
  evalLethalConsentTimeout({ deliveryFailed = false, now } = {}) {
    if (!this.lethalConsent) return null;
    const before = this.lethalConsent.status;
    if (deliveryFailed) this.lethalConsent = consentSM.markDeliveryFailed(this.lethalConsent);
    const evalNow = now === undefined ? this.now() : now;
    this.lethalConsent = consentSM.evalTimeout(this.lethalConsent, { now: evalNow });
    const snap = consentSM.snapshot(this.lethalConsent);
    if (before === 'pending' && this.lethalConsent.status !== 'pending') {
      this._clearLethalConsentTimer(); // round resolved -> auto-timeout moot
      this._emit('lethal_consent_resolved', {
        outcome: consentSM.outcome(this.lethalConsent),
        snapshot: snap,
      });
    }
    return snap;
  }

  /** Anonymous snapshot (F5) of the current round, or null when none is open. */
  lethalConsentSnapshot() {
    return this.lethalConsent ? consentSM.snapshot(this.lethalConsent) : null;
  }

  /** 'granted' only when every at-risk player confirmed; else 'soft'. */
  lethalConsentOutcome() {
    return consentSM.outcome(this.lethalConsent);
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
   * SPEC-K K-01 design-call DC#1 (RESOLVED 2026-06-20, master-dd default):
   * KEEP host-arbiter (HOST_TECHNICAL), NOT a device quorum. Rationale: this is
   * run-shell navigation, not a player-facing route choice -- route-vote (K-03)
   * already owns the node choice, and `retreat` is destructive (ends the run for
   * everyone), so a bare quorum would be wrong; a migration would need per-player
   * consent (sez.6.4), not a vote. Not a migration gap.
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
    // Fail-closed host gate (mirrors startMissionFromNido / K-05 #2871):
    // a null/undefined hostId (e.g. transient host-transfer gap) must NOT
    // short-circuit the identity check, else any player could submit the
    // host-only macro. Reject the no-host state explicitly first.
    if (!hostId) throw new Error('no_host');
    if (playerId !== hostId) throw new Error('host_only');
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
    // Fail-closed: a null hostId (e.g. a host-transfer gap) must NOT silently
    // skip the host gate and let any player force-start (coop-phase-validator P2).
    if (!hostId) throw new Error('no_host');
    if (playerId !== hostId) throw new Error('host_only');
    if (this.phase !== 'nido') throw new Error('not_in_nido');
    const advance = this.advanceScenarioOrEnd();
    return { phase: this.phase, advance, run_state: this.run };
  }

  /**
   * SPEC-K K-05 — Nido next-mission readiness QUORUM (device-authority). Each
   * connected player marks ready on their OWN device instead of the host gating
   * the start; `startMissionFromNido()` stays as the host anti-deadlock fallback.
   * Mirrors voteWorld/worldTally. Phase must be 'nido'. Idempotent re-mark.
   *
   * @param playerId
   * @param ready — true (ready to leave) | false (retracts)
   * @returns missionReadyTally
   */
  markMissionReady(playerId, { ready = true, allPlayerIds = [], connectedPlayerIds } = {}) {
    if (this.phase !== 'nido') throw new Error('not_in_nido');
    if (!playerId) throw new Error('player_id_required');
    this.missionReadyVotes.set(playerId, { ready: Boolean(ready), ts: this.now() });
    this._emit('mission_ready', { player_id: playerId, ready: Boolean(ready) });
    return this.missionReadyTally(allPlayerIds, connectedPlayerIds);
  }

  /**
   * SPEC-K K-05 — readiness tally. `all_connected_ready` is the device-authority
   * advance signal (every connected player marked ready). Mirror of worldTally:
   * `connectedPlayerIds` omitted -> connected_* fields absent (legacy callers).
   */
  missionReadyTally(allPlayerIds = [], connectedPlayerIds) {
    let ready = 0;
    const perPlayer = {};
    for (const [pid, v] of this.missionReadyVotes.entries()) {
      if (v.ready) ready += 1;
      perPlayer[pid] = v;
    }
    const cast = this.missionReadyVotes.size;
    const tally = {
      ready,
      total: allPlayerIds.length || cast,
      pending: Math.max(allPlayerIds.length - cast, 0),
      per_player: perPlayer,
    };
    if (Array.isArray(connectedPlayerIds)) {
      const connected = connectedPlayerIds.filter(Boolean);
      const connectedTotal = connected.length;
      let connectedReady = 0;
      let connectedCast = 0;
      for (const pid of connected) {
        const v = this.missionReadyVotes.get(pid);
        if (!v) continue;
        connectedCast += 1; // cast = acted (ready OR retracted), mirror worldTally connectedVoted
        if (v.ready) connectedReady += 1;
      }
      tally.connected_total = connectedTotal;
      tally.connected_ready = connectedReady;
      // pending = NOT-yet-acted (a ready:false retract has acted -> not pending).
      tally.connected_pending = Math.max(connectedTotal - connectedCast, 0);
      // Advance signal: every connected player ready (empty set -> false, no
      // auto-advance with zero participants -- mirrors worldTally).
      tally.all_connected_ready = connectedTotal > 0 && connectedReady === connectedTotal;
    }
    return tally;
  }

  // ---- C2-imprint beat (NON-gating side-collection; mirror formPulses + missionReadyTally) ----

  // Reset all imprint beat state. Called on run (re)start; the cosmetic hint is
  // run-scoped (persists across scenario advances within a run, re-imprinted only on a
  // fresh run -- so it is NOT cleared in advanceScenarioOrEnd).
  _resetImprint() {
    this._clearImprintTimer();
    this.imprintTimeoutWarning = false;
    this.imprintMarks.clear();
    this.imprintAssignment = null;
    this.imprintOpen = false;
    this.brancoBiomeHint = null;
    this.imprintTuple = null;
  }

  // Cancel the pending imprint deadline timer, if any (mirror _clearLethalConsentTimer).
  _clearImprintTimer() {
    if (this._imprintTimer) {
      this._clearTimeoutFn(this._imprintTimer);
      this._imprintTimer = null;
    }
  }

  // Round-robin the 4 fixed axes over the connected players so every axis is owned by
  // exactly one player and ownership scales to N=2-4 (4p -> 1 axis each; 3p -> one player
  // owns 2; 2p -> 2 each). Pure; never throws.
  assignImprintAxes(connectedPlayerIds = []) {
    const players = (Array.isArray(connectedPlayerIds) ? connectedPlayerIds : []).filter(Boolean);
    const out = {};
    for (const pid of players) out[pid] = [];
    if (players.length === 0) return out;
    IMPRINT_AXES.forEach((axis, i) => {
      out[players[i % players.length]].push(axis);
    });
    return out;
  }

  // Host opens the beat (route enforces host). Assigns axes to the connected players,
  // clears any prior marks/hint, marks the beat open. Non-gating: does NOT change phase.
  openImprint({ connectedPlayerIds = [], timeoutMs, onTimeout } = {}) {
    this._clearImprintTimer();
    this.imprintTimeoutWarning = false;
    this.imprintMarks.clear();
    this.brancoBiomeHint = null;
    this.imprintTuple = null;
    this.imprintAssignment = this.assignImprintAxes(connectedPlayerIds);
    this.imprintOpen = true;
    this._emit('imprint_opened', { assignment: this.imprintAssignment });
    this._armImprintTimer(timeoutMs, onTimeout);
    return this.imprintTally();
  }

  // Arm the WARNING-ONLY deadline (mirror openLethalConsent: DI _setTimeoutFn + unref so it
  // never keeps the process alive). On fire: flag `timeout_warning` (the beat STAYS open) +
  // invoke onTimeout so the transport re-broadcasts. NO auto-default / auto-complete --
  // host force/cancel or the device marks remain the only resolutions.
  _armImprintTimer(timeoutMs, onTimeout) {
    if (typeof timeoutMs !== 'number' || timeoutMs <= 0) return;
    const handle = this._setTimeoutFn(() => {
      if (!this.imprintOpen) return;
      this.imprintTimeoutWarning = true;
      this._emit('imprint_timeout_warning', {});
      if (typeof onTimeout === 'function') {
        try {
          onTimeout(this.imprintTally());
        } catch (_e) {
          /* never crash the timer callback (unhandled throw in setTimeout = process exit) */
        }
      }
    }, timeoutMs);
    if (handle && typeof handle.unref === 'function') handle.unref();
    this._imprintTimer = handle;
  }

  // A player marks ITS assigned axis (device-authority: only the owner may mark an axis).
  // Typed errors the route maps to 4xx; never silently mutates on a closed/unknown beat.
  // On all-4-axes-marked, stamps the cosmetic hint.
  submitImprintMark(playerId, { axis, value } = {}) {
    if (!this.imprintOpen) throw new Error('imprint_not_open');
    if (!playerId) throw new Error('player_id_required');
    if (!IMPRINT_AXES.includes(axis)) throw new Error('invalid_axis');
    if (!isValidAxisValue(axis, value)) throw new Error('invalid_value');
    const owned =
      this.imprintAssignment && Array.isArray(this.imprintAssignment[playerId])
        ? this.imprintAssignment[playerId]
        : null;
    if (!owned) throw new Error('player_not_assigned');
    if (!owned.includes(axis)) throw new Error('axis_not_assigned');
    this.imprintMarks.set(axis, {
      value: String(value).toUpperCase(),
      by: playerId,
      ts: this.now(),
    });
    this._emit('imprint_marked', { axis, by: playerId });
    if (IMPRINT_AXES.every((a) => this.imprintMarks.has(a))) this._computeImprintHint();
    return this.imprintTally();
  }

  // Axis-based readiness tally (the 4 fixed axes, NOT per-player -- a 2-3p team completes
  // when all 4 axes have a value). `all_axes_marked` is the cosmetic-hint trigger.
  imprintTally() {
    const perAxis = {};
    for (const axis of IMPRINT_AXES) {
      const m = this.imprintMarks.get(axis);
      perAxis[axis] = m ? { value: m.value, by: m.by } : null;
    }
    const pending = IMPRINT_AXES.filter((a) => !this.imprintMarks.has(a));
    return {
      open: this.imprintOpen,
      assignment: this.imprintAssignment,
      axes_total: IMPRINT_AXES.length,
      axes_marked: IMPRINT_AXES.length - pending.length,
      axes_pending: pending,
      all_axes_marked: pending.length === 0,
      per_axis: perAxis,
      branco_biome_hint: this.brancoBiomeHint,
      timeout_warning: this.imprintTimeoutWarning,
    };
  }

  // Build the team 4-tuple from the marks and stamp the COSMETIC biome-affinity hint.
  // NEVER assigns/binds a biome (route-canon); display-only. Closes the beat.
  _computeImprintHint() {
    const tuple = {};
    for (const axis of IMPRINT_AXES) {
      const m = this.imprintMarks.get(axis);
      if (m) tuple[axis] = m.value;
    }
    const weights = computeImprintBiomeWeights([tuple]);
    const leans = topBiome(weights);
    // D7: additive diegetic tendency descriptor ("il tuo branco tende verso X").
    // Structure only (i18n key + var); the player-facing prose is master-dd HITL.
    this.brancoBiomeHint = leans
      ? { leans_toward: leans, weights, tendency: brancoTendencyHint(leans) }
      : null;
    // D6: stamp the resolved team tuple for the branco-trait emergence (stacking B).
    this.imprintTuple = tuple;
    this.imprintOpen = false;
    this._clearImprintTimer();
    this.imprintTimeoutWarning = false;
    this._emit('imprint_hint', this.brancoBiomeHint);
    // D6 (flag-gated): re-resolve the single branco slot so a late imprint can fill an
    // empty Form-Pulse slot (Form-Pulse precedence preserved). OFF -> no-op.
    if (isImprintTraitGrantEnabled()) this._applyBrancoTraitEmergence();
    return this.brancoBiomeHint;
  }

  // Anti-deadlock: fill pending axes with the onboarding defaults, then stamp the hint.
  // Used by the open beat's timeout (wiring) and host force.
  forceCompleteImprint() {
    if (!this.imprintOpen) return this.imprintTally();
    for (const axis of IMPRINT_AXES) {
      if (!this.imprintMarks.has(axis)) {
        this.imprintMarks.set(axis, {
          value: IMPRINT_AXIS_DEFAULTS[axis],
          by: null,
          ts: this.now(),
        });
      }
    }
    this._computeImprintHint();
    return this.imprintTally();
  }

  // Host cancel (anti-deadlock soft escape). Abandons the beat without a hint.
  cancelImprint() {
    this._clearImprintTimer();
    this.imprintTimeoutWarning = false;
    this.imprintOpen = false;
    this.imprintMarks.clear();
    this.imprintAssignment = null;
    this.brancoBiomeHint = null;
    this.imprintTuple = null;
    this._emit('imprint_cancelled', {});
    return this.imprintTally();
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

  /**
   * Advance to the next scenario or end the run.
   * @returns { action: 'ended' } | { action: 'next_scenario', index } — plus
   *   an ADDITIVE `creature_named: [{ actor_id, player_id, name, stage,
   *   mbti_reveal }]` key when M-2 name emergence fires on this advance
   *   (juvenile naming / apex reveal). Consumers must not strict-match shape.
   */
  advanceScenarioOrEnd() {
    if (!this.run) throw new Error('no_run');
    // SPEC-J: drop any armed auto-timeout before leaving the scenario (covers
    // both the `ended` and `next_scenario` branches below; consent is per-
    // scenario, the timer must never outlive its round).
    this._clearLethalConsentTimer();
    this.run.currentIndex += 1;
    // M-2 -- run progression is the PROPOSED lifecycle proxy: emergence fires
    // here (scenario cleared / run complete), before phase transition, so the
    // creature_named event lands at the debrief->advance moment.
    const cleared = this.run.currentIndex;
    if (this.run.currentIndex >= this.run.scenarioStack.length) {
      const named = this._applyNameEmergence(proposedStageByProgression(cleared, true));
      this._setPhase('ended');
      this._emit('run_ended', { run_id: this.run.id });
      return { action: 'ended', ...(named.length ? { creature_named: named } : {}) };
    }
    const named = this._applyNameEmergence(proposedStageByProgression(cleared, false));
    this.characters.forEach((ch) => {
      ch.ready = true; // carry over
    });
    this.debriefChoices.clear();
    this.worldVotes.clear();
    this.proposedWorld = null; // SPEC-K K-02 — drop stale world proposal
    this.missionReadyVotes.clear();
    this.sessionId = null;
    this.matingVotes.clear();
    this.routeVotes.clear();
    this.routeCandidates = null;
    this.formPulses.clear();
    this._clearFormPulseTimer();
    this.formPulseTimeoutWarning = false;
    // Codex #3083 P2: strip the branco/minor traits from the persisting party
    // BEFORE clearing the trackers (else the next slot source double-stacks).
    this._clearEmergentTraits();
    this.revealAcks.clear();
    // Codex #2794 P1: consent is per-scenario (a lethal mission = a scenario),
    // but the run keeps the same run.id == campaign_id across scenarios. Without
    // this, a consent granted for scenario A would still resolve `granted` for
    // scenario B's KO bridge -> a stale-consent permadeath. Clear it on advance.
    this.lethalConsent = null;
    this._setPhase('world_setup');
    return {
      action: 'next_scenario',
      index: this.run.currentIndex,
      ...(named.length ? { creature_named: named } : {}),
    };
  }

  snapshot() {
    return {
      roomCode: this.roomCode,
      phase: this.phase,
      run: this.run,
      characters: Array.from(this.characters.values()),
      log: this.log.slice(-50),
      // C2-imprint -- additive, guarded: present only when the beat is open or a hint was
      // stamped, so the snapshot stays byte-identical when the flag is OFF (band-neutral).
      ...(this.imprintOpen || this.brancoBiomeHint ? { imprint: this.imprintTally() } : {}),
    };
  }
}

module.exports = { CoopOrchestrator, characterToUnit, PHASES };
