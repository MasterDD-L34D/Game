// I1+I2 pattern (inkle/ink): narrative engine per briefing/debrief.
//
// Wrappa inkjs Story per fornire:
//   - loadStory(jsonPath) → Story instance
//   - bindSessionData(story, session) → bind external functions
//   - runUntilChoice(story) → { text[], choices[] }
//   - makeChoice(story, index) → { text[], choices[] }
//
// Le storie .ink vengono compilate a .ink.json tramite inklecate CLI
// (non incluso — usare https://github.com/inkle/ink/releases).
// In dev, storie possono essere scritte direttamente in JSON format.
//
// Vedi docs/planning/tactical-architecture-patterns.md §I1, §I2

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { Story } = require('inkjs');

const NARRATIVES_DIR = path.resolve(__dirname, '../../data/narrative');

// 2026-04-27 Bundle B.1 — Citizen Sleeper-style drift briefing pack.
// Lightweight YAML pack (3 scenarios × 3 variants) gated su MBTI T_F asse.
// Separato da data/narrative/tutorial_briefings.yaml (engine briefingVariations
// usa quello). Drift è gating dedicato player-aggregate, non per-replay.
const DRIFT_BRIEFINGS_DIR = path.resolve(__dirname, '../../data/core/narrative/briefings');
const DRIFT_BRIEFINGS_DEFAULT = path.join(DRIFT_BRIEFINGS_DIR, 'drift_briefings.yaml');

let _driftPackCache = null;

function _loadDriftPack(pathOverride = null) {
  if (pathOverride === null && _driftPackCache !== null) return _driftPackCache;
  const target = pathOverride || DRIFT_BRIEFINGS_DEFAULT;
  try {
    const raw = fs.readFileSync(target, 'utf-8');
    const parsed = yaml.load(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.scenarios) return null;
    if (pathOverride === null) _driftPackCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

/** Test hook — invalida cache pack drift. */
function _resetDriftPackCache() {
  _driftPackCache = null;
}

/**
 * Citizen Sleeper drift gating: classifica un VC snapshot in 3 varianti
 * basate sul T_F MBTI asse aggregato (mean across actors). Threshold simmetrici
 * 0.65 / 0.35 coerenti con dead-band MBTI iter1 (vedi services/vcScoring.js
 * deriveMbtiType, events_count<30 → 0.35/0.65).
 *
 * @param {object} vcSnapshot — snapshot da buildVcSnapshot (può essere null)
 * @returns {'tech'|'empatic'|'neutral'} variant key
 */
function classifyDriftVariant(vcSnapshot) {
  const perActor = vcSnapshot?.per_actor;
  if (!perActor || typeof perActor !== 'object') return 'neutral';
  const tfValues = [];
  for (const actor of Object.values(perActor)) {
    const tf = actor?.mbti_axes?.T_F;
    if (tf && typeof tf.value === 'number' && Number.isFinite(tf.value)) {
      tfValues.push(tf.value);
    }
  }
  if (tfValues.length === 0) return 'neutral';
  const mean = tfValues.reduce((a, b) => a + b, 0) / tfValues.length;
  if (mean > 0.65) return 'tech';
  if (mean < 0.35) return 'empatic';
  return 'neutral';
}

/**
 * Bundle B.1 main: seleziona briefing pre-mission per (scenario, vcSnapshot).
 * Pattern: Citizen Sleeper drift dialogue gated su MBTI T_F.
 *
 * @param {string} scenarioId — es. "enc_tutorial_01"
 * @param {object|null} vcSnapshot — output di buildVcSnapshot (null OK → neutral)
 * @param {object} [opts]
 * @param {string|null} [opts.fallback] — testo da ritornare se pack manca
 * @param {object|null} [opts.pack] — pack precaricato (test hook)
 * @returns {{ variant: 'tech'|'empatic'|'neutral', text: string, source: 'drift'|'fallback' }|null}
 */
function selectDriftBriefing(scenarioId, vcSnapshot, opts = {}) {
  const fallback = opts.fallback ?? null;
  const pack = opts.pack || _loadDriftPack();
  const variant = classifyDriftVariant(vcSnapshot);
  const stitches = pack?.scenarios?.[scenarioId]?.pre;
  if (!stitches || typeof stitches !== 'object') {
    return fallback ? { variant, text: fallback, source: 'fallback' } : null;
  }
  const text = stitches[variant] || stitches.neutral || fallback;
  if (!text) return null;
  return {
    variant,
    text: String(text).trim(),
    source: pack ? 'drift' : 'fallback',
  };
}

/**
 * Carica e inizializza una Story inkjs da file JSON.
 * @param {string} storyFile — nome file relativo a data/narrative/ (es. "briefing_default.ink.json")
 * @returns {import('inkjs').Story}
 */
function loadStory(storyFile) {
  const fullPath = path.join(NARRATIVES_DIR, storyFile);
  const json = fs.readFileSync(fullPath, 'utf-8');
  return new Story(json);
}

/**
 * I2 pattern: bind dati sessione come external functions per ink.
 * Permette a ink di leggere dati live: species, trait, VC scores.
 *
 * @param {import('inkjs').Story} story
 * @param {object} sessionData — { units, vc, session_id, ... }
 */
function bindSessionData(story, sessionData = {}) {
  // getUnitName(unitId) → species name
  story.BindExternalFunction('getUnitName', (unitId) => {
    const unit = (sessionData.units || []).find((u) => u.id === unitId);
    return unit ? unit.species || unit.species_id || unitId : unitId;
  });

  // getUnitHp(unitId) → current HP
  story.BindExternalFunction('getUnitHp', (unitId) => {
    const unit = (sessionData.units || []).find((u) => u.id === unitId);
    return unit ? Number(unit.hp) || 0 : 0;
  });

  // getVCScore(metric) → VC value
  story.BindExternalFunction('getVCScore', (metric) => {
    const vc = sessionData.vc || {};
    return Number(vc[metric]) || 0;
  });

  // getSessionVar(key) → arbitrary session variable
  story.BindExternalFunction('getSessionVar', (key) => {
    return sessionData[key] !== undefined ? String(sessionData[key]) : '';
  });
}

/**
 * Esegue la story fino alla prossima scelta o fine.
 * Raccoglie tutto il testo + tags emessi.
 *
 * @param {import('inkjs').Story} story
 * @returns {{ lines: Array<{text: string, tags: string[]}>, choices: Array<{index: number, text: string}>, ended: boolean }}
 */
function runUntilChoice(story) {
  const lines = [];
  while (story.canContinue) {
    const rawText = story.Continue().trim();
    const tags = story.currentTags || [];
    if (rawText) {
      // OD-013 Path B: auto-tag con MBTI se ink emette `# mbti:X` tag.
      // Backward compat: storylets senza tag mbti → text invariato.
      const axisLetters = extractMbtiAxisFromTags(tags);
      const text = axisLetters.length > 0 ? tagDialogueLineWithMbti(rawText, axisLetters) : rawText;
      lines.push({ text, tags });
    }
  }

  const choices = (story.currentChoices || []).map((c, i) => ({
    index: i,
    text: c.text,
  }));

  return {
    lines,
    choices,
    ended: !story.canContinue && choices.length === 0,
  };
}

/**
 * Seleziona una scelta e continua la story.
 *
 * @param {import('inkjs').Story} story
 * @param {number} choiceIndex
 * @returns {{ lines: Array<{text: string, tags: string[]}>, choices: Array<{index: number, text: string}>, ended: boolean }}
 */
function makeChoice(story, choiceIndex) {
  story.ChooseChoiceIndex(choiceIndex);
  return runUntilChoice(story);
}

/**
 * Salva stato corrente della story per resume futuro.
 * @param {import('inkjs').Story} story
 * @returns {string} JSON state
 */
function saveState(story) {
  return story.state.toJson();
}

/**
 * Ripristina stato salvato.
 * @param {import('inkjs').Story} story
 * @param {string} stateJson
 */
function loadState(story, stateJson) {
  story.state.LoadJson(stateJson);
}

/**
 * Lista storie disponibili in data/narrative/.
 * @returns {string[]} nomi file .ink.json
 */
function listStories() {
  if (!fs.existsSync(NARRATIVES_DIR)) return [];
  return fs.readdirSync(NARRATIVES_DIR).filter((f) => f.endsWith('.ink.json'));
}

// OD-013 Path B integration — MBTI dialogue color tagging hook.
//
// Lazy-import + try/catch non-blocking: se mbtiPalette mancasse/rotto,
// il narrative engine continua a emettere testo plain (zero breaking change).
// Invocato da consumer che ha contesto axis (storylet field `mbti_axis`,
// QBN event, brief variation tag). Se nessun axis context → passthrough.
//
// Forma del tag: `<mbti axis="X">testo</mbti>` (vedi mbtiPalette.mbtiTaggedLine).
// Frontend renderizza colore SOLO se asse rivelato (Path A gating).
let _mbtiPaletteCache = null;
function _loadMbtiPaletteHelper() {
  if (_mbtiPaletteCache !== null) return _mbtiPaletteCache;
  try {
    // eslint-disable-next-line global-require
    _mbtiPaletteCache = require('../../apps/backend/services/mbtiPalette');
  } catch {
    _mbtiPaletteCache = false; // sentinel: tried + failed, do not retry per process
  }
  return _mbtiPaletteCache;
}

/**
 * Tag una linea di dialogo con asse MBTI (Path B). ADDITIVE only:
 * input senza axisLetters → passthrough invariato. Errori di import →
 * passthrough silenzioso.
 *
 * @param {string} text — linea dialogue
 * @param {string[]} [axisLetters] — sottoinsieme di E/I/S/N/T/F/J/P
 * @returns {string} testo (eventualmente wrapped `<mbti axis="X">...</mbti>`)
 */
function tagDialogueLineWithMbti(text, axisLetters) {
  if (typeof text !== 'string') return '';
  if (text.length === 0) return '';
  if (!Array.isArray(axisLetters) || axisLetters.length === 0) return text;
  const helper = _loadMbtiPaletteHelper();
  if (!helper || typeof helper.mbtiTaggedLine !== 'function') return text;
  try {
    return helper.mbtiTaggedLine(text, axisLetters);
  } catch {
    return text;
  }
}

/**
 * Estrae axisLetters da `tags[]` di una line ink. Convention: tag prefix
 * `mbti:X` (es. `mbti:F`, `mbti:T`). Tag senza prefix → ignorati.
 *
 * @param {string[]} tags
 * @returns {string[]} lettere MBTI valide (può essere [])
 */
function extractMbtiAxisFromTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return [];
  const letters = [];
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    const match = tag.match(/^mbti:([EISNTFJP])$/);
    if (match) letters.push(match[1]);
  }
  return letters;
}

/** Reset cache helper (per test). */
function _resetMbtiPaletteCache() {
  _mbtiPaletteCache = null;
}

// Sprint δ Meta Systemic — Stellaris event chain scripting bridge.
// Lazy require to avoid coupling narrative engine startup with chain loader.
function triggerEventChain(chain_id, session, options = {}) {
  const { triggerEvent } = require('../../apps/backend/services/meta/eventChainScripting');
  return triggerEvent(chain_id, session, options);
}

// TKT-MUSEUM-SKIV-VOICES — Type 5 + Type 7 voice palette selector.
// Lazy require: ennea voice module legge YAML at first access, cached per process.
// Caller pattern: selectEnneaVoice(vcSnapshot.ennea_archetypes, beat_id, { rand })
//   -> { archetype_id, line_id, text } | null. Se non null, caller emette
//   buildVoiceTelemetryEvent(actor_id, selection) come session event.
function selectEnneaVoice(enneaArchetypes, beatId, options = {}) {
  const mod = require('../../apps/backend/services/narrative/enneaVoice');
  return mod.selectEnneaVoice(enneaArchetypes, beatId, options);
}

function buildEnneaVoiceTelemetryEvent(actorId, selection, options = {}) {
  const mod = require('../../apps/backend/services/narrative/enneaVoice');
  return mod.buildVoiceTelemetryEvent(actorId, selection, options);
}

function listEnneaVoiceBeats() {
  const mod = require('../../apps/backend/services/narrative/enneaVoice');
  return mod.listSupportedBeats();
}

function listEnneaVoiceArchetypes() {
  const mod = require('../../apps/backend/services/narrative/enneaVoice');
  return mod.listSupportedArchetypes();
}

module.exports = {
  NARRATIVES_DIR,
  DRIFT_BRIEFINGS_DIR,
  DRIFT_BRIEFINGS_DEFAULT,
  loadStory,
  bindSessionData,
  runUntilChoice,
  makeChoice,
  saveState,
  loadState,
  listStories,
  tagDialogueLineWithMbti,
  extractMbtiAxisFromTags,
  classifyDriftVariant,
  selectDriftBriefing,
  triggerEventChain,
  selectEnneaVoice,
  buildEnneaVoiceTelemetryEvent,
  listEnneaVoiceBeats,
  listEnneaVoiceArchetypes,
  _resetMbtiPaletteCache,
  _resetDriftPackCache,
};
