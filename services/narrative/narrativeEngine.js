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
const { Story } = require('inkjs');

const NARRATIVES_DIR = path.resolve(__dirname, '../../data/narrative');

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

module.exports = {
  NARRATIVES_DIR,
  loadStory,
  bindSessionData,
  runUntilChoice,
  makeChoice,
  saveState,
  loadState,
  listStories,
  tagDialogueLineWithMbti,
  extractMbtiAxisFromTags,
  _resetMbtiPaletteCache,
};
