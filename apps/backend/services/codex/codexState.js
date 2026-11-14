// Bundle B.3 — Tunic decipher Codex state management.
//
// In-memory store per session_id → Set<page_id> deciphered.
// Loader YAML pages from data/core/codex/pages/*.yaml.
// API:
//   - loadCodexPages() -> { pages: [...] }   (cached singleton)
//   - getDeciphered(sessionId) -> Set<string>
//   - markDeciphered(sessionId, pageId) -> { added: bool }
//   - validateTrigger(page, triggerData) -> bool
//   - listPagesForSession(sessionId) -> [{ ...page, deciphered }]
//   - resetSession(sessionId) -> void
//
// Trigger types supported:
//   - always              → tutorial pages always_deciphered=true
//   - enter_biome         → triggerData.biome_id matches condition.biome_id
//   - kill_species        → triggerData.species_id matches condition.species_id
//   - apply_trait         → triggerData.trait_id matches condition.trait_id
//   - mating_attempt      → triggerData.species_a + species_b match (any order)

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const PAGES_DIR = path.resolve(__dirname, '../../../../data/core/codex/pages');

let _cachedPages = null;
const _bySession = new Map(); // sessionId → Set<pageId>

function loadCodexPages({ force = false } = {}) {
  if (_cachedPages && !force) return _cachedPages;
  const pages = [];
  if (!fs.existsSync(PAGES_DIR)) {
    _cachedPages = { pages: [] };
    return _cachedPages;
  }
  const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  for (const f of files) {
    const raw = fs.readFileSync(path.join(PAGES_DIR, f), 'utf8');
    const parsed = yaml.load(raw);
    const arr = Array.isArray(parsed?.pages) ? parsed.pages : [];
    for (const p of arr) {
      if (!p || !p.id) continue;
      pages.push(p);
    }
  }
  _cachedPages = { pages };
  return _cachedPages;
}

function getDeciphered(sessionId) {
  if (!sessionId) return new Set();
  if (!_bySession.has(sessionId)) {
    // Auto-decipher always-true pages on first access.
    const set = new Set();
    const { pages } = loadCodexPages();
    for (const p of pages) {
      if (p.always_deciphered === true || p?.decipher_trigger?.type === 'always') {
        set.add(p.id);
      }
    }
    _bySession.set(sessionId, set);
  }
  return _bySession.get(sessionId);
}

function markDeciphered(sessionId, pageId) {
  const set = getDeciphered(sessionId);
  if (set.has(pageId)) return { added: false };
  set.add(pageId);
  return { added: true };
}

function validateTrigger(page, triggerData) {
  if (!page || !page.decipher_trigger) return false;
  const trig = page.decipher_trigger;
  const td = triggerData || {};
  if (trig.type === 'always') return true;
  const cond = trig.condition || {};
  if (trig.type === 'enter_biome') {
    return Boolean(cond.biome_id) && String(td.biome_id) === String(cond.biome_id);
  }
  if (trig.type === 'kill_species') {
    return Boolean(cond.species_id) && String(td.species_id) === String(cond.species_id);
  }
  if (trig.type === 'apply_trait') {
    return Boolean(cond.trait_id) && String(td.trait_id) === String(cond.trait_id);
  }
  if (trig.type === 'mating_attempt') {
    if (!cond.species_a || !cond.species_b) return false;
    const td1 = String(td.species_a || '');
    const td2 = String(td.species_b || '');
    return (
      (td1 === String(cond.species_a) && td2 === String(cond.species_b)) ||
      (td1 === String(cond.species_b) && td2 === String(cond.species_a))
    );
  }
  return false;
}

function listPagesForSession(sessionId) {
  const { pages } = loadCodexPages();
  const set = getDeciphered(sessionId);
  return pages.map((p) => {
    const deciphered = set.has(p.id);
    return {
      id: p.id,
      title: p.title,
      category: p.category || null,
      deciphered,
      content: deciphered ? p.content_clear || '' : p.content_blurred || '',
      decipher_hint: deciphered ? null : p?.decipher_trigger?.description || null,
      decipher_trigger_type: p?.decipher_trigger?.type || null,
    };
  });
}

function findPage(pageId) {
  const { pages } = loadCodexPages();
  return pages.find((p) => p.id === pageId) || null;
}

function resetSession(sessionId) {
  _bySession.delete(sessionId);
}

function _resetAll() {
  _bySession.clear();
  _cachedPages = null;
}

module.exports = {
  loadCodexPages,
  getDeciphered,
  markDeciphered,
  validateTrigger,
  listPagesForSession,
  findPage,
  resetSession,
  _resetAll,
};
