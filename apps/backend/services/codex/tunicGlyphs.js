// Tunic decipher Codex — backend logic.
//
// Source: docs/research/2026-04-27-indie-concept-rubabili.md (Tunic decipher pages).
// Decision codified: docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md §H.4 ADOPT.
//
// Pattern: glyph language progressively-decifrabile via gameplay events.
// Player accumula counter per evento (attacks_executed, defends_executed,
// mutations_applied, ally_adjacent_attacks, biomes_visited) → glyph unlock
// quando counter >= threshold.
//
// API:
//   loadGlyphs() → { glyphs, pages } da YAML
//   getCodexState(campaignId) → { unlocked: [glyph_id], counters: { event: N } }
//   incrementCounter(campaignId, event, delta=1) → { unlocked_new: [glyph_id] }
//   listGlyphsForCampaign(campaignId) → glyphs annotated con state (locked/unlocked)
//
// State storage: in-memory Map per campaign_id (Prisma write-through TBD).

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const YAML_PATH = path.resolve(__dirname, '../../../../data/core/codex/tunic_glyphs.yaml');

let _catalog = null;
const _campaignState = new Map(); // campaign_id -> { unlocked: Set, counters: {} }

function loadGlyphs() {
  if (_catalog) return _catalog;
  try {
    const raw = fs.readFileSync(YAML_PATH, 'utf-8');
    _catalog = yaml.load(raw);
    return _catalog;
  } catch (err) {
    console.warn('[tunicGlyphs] config not loaded:', err.message);
    _catalog = { glyphs: {}, pages: {} };
    return _catalog;
  }
}

function _ensureState(campaignId) {
  let s = _campaignState.get(campaignId);
  if (!s) {
    s = { unlocked: new Set(), counters: {} };
    _campaignState.set(campaignId, s);
  }
  return s;
}

function getCodexState(campaignId) {
  const s = _ensureState(campaignId);
  return {
    unlocked: [...s.unlocked],
    counters: { ...s.counters },
  };
}

function _checkUnlocks(campaignId) {
  const cat = loadGlyphs();
  const s = _ensureState(campaignId);
  const newlyUnlocked = [];
  for (const [gid, g] of Object.entries(cat.glyphs || {})) {
    if (s.unlocked.has(gid)) continue;
    const cond = g.unlock_condition || {};
    const ev = cond.event;
    const thr = Number(cond.threshold || 0);
    if (ev && (s.counters[ev] || 0) >= thr) {
      s.unlocked.add(gid);
      newlyUnlocked.push(gid);
    }
  }
  return newlyUnlocked;
}

function incrementCounter(campaignId, event, delta = 1) {
  if (!campaignId || !event) return { unlocked_new: [] };
  const s = _ensureState(campaignId);
  s.counters[event] = (s.counters[event] || 0) + Math.max(0, Number(delta) || 0);
  const unlockedNew = _checkUnlocks(campaignId);
  return { unlocked_new: unlockedNew, counter: s.counters[event] };
}

function listGlyphsForCampaign(campaignId) {
  const cat = loadGlyphs();
  const s = _ensureState(campaignId);
  return Object.entries(cat.glyphs || {}).map(([gid, g]) => {
    const isUnlocked = s.unlocked.has(gid);
    return {
      id: gid,
      glyph: g.glyph,
      label: isUnlocked ? g.label_unlocked : g.label_locked,
      hint_unlock: g.hint_unlock,
      description: isUnlocked ? g.description_unlocked : null,
      unlocked: isUnlocked,
      progress: {
        event: g.unlock_condition?.event || null,
        current: s.counters[g.unlock_condition?.event] || 0,
        threshold: Number(g.unlock_condition?.threshold || 0),
      },
      page_id: g.page_id || null,
    };
  });
}

function getPage(pageId, campaignId) {
  const cat = loadGlyphs();
  const page = (cat.pages || {})[pageId];
  if (!page) return null;
  const s = _ensureState(campaignId);
  // Render body con glyph references — locked glyphs shown as bare symbol,
  // unlocked glyphs shown as label text. Pattern Tunic decifer.
  return {
    id: pageId,
    title_it: page.title_it,
    body_it: page.body_it,
    glyphs_referenced: (page.glyphs_referenced || []).map((gid) => {
      const g = (cat.glyphs || {})[gid];
      return {
        id: gid,
        glyph: g?.glyph || gid,
        unlocked: s.unlocked.has(gid),
      };
    }),
  };
}

function _resetState() {
  _campaignState.clear();
  _catalog = null;
}

module.exports = {
  loadGlyphs,
  getCodexState,
  incrementCounter,
  listGlyphsForCampaign,
  getPage,
  _resetState,
};
