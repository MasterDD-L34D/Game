// 2026-05-06 TKT-P4-ENNEA-VOICE-FRONTEND — Ennea voice debrief render.
//
// Engine LIVE: apps/backend/services/narrative/enneaVoice.js selectEnneaVoice
// + endpoint /:id/voice + 9/9 archetype × 7 beat × ~189 line authorate in
// data/core/narrative/ennea_voices/. Wired in rewardEconomy.js
// buildDebriefSummary → debrief response includes `ennea_voices: [{
// actor_id, archetype_id, ennea_type, beat_id, line_id, text }, ...]`.
//
// Surface DEAD pre-2026-05-06: debrief panel non consumava ennea_voices.
// Player MAI vedeva una linea voice Ennea durante gameplay (Engine LIVE
// Surface DEAD anti-pattern flagged in audit master).
//
// Surface NEW: debrief panel mostra 1 quote diegetic per actor con
// triggered ennea archetypes. Per actor: persona-quote in italian con
// archetype label + beat hint. 9 archetype con palette colori distinti
// (Disco-Elysium-inspired thought cabinet).

'use strict';

// TKT-P4-DIALOGUE-COLORS (2026-05-30): voce archetipo color-coded per asse MBTI.
// Il backend (rewardEconomy.buildDebriefSummary) avvolge il testo in
// `<mbti axis="X">...</mbti>` via mbtiTaggedLine usando il polo dominante
// dell'attore; qui lo renderizziamo a colori (forceReveal — la voce È il reveal).
import { renderMbtiTaggedHtml } from './dialogueRender.js';
import { t } from './i18n.js';

// Mapping archetype_id → metadata UI (icon + label + color).
// Color = Disco-Elysium thought cabinet aesthetic (subtle gradient bg).
const ARCHETYPE_META = {
  'Riformatore(1)': { icon: '◉', cls: 'archetype-1' },
  'Coordinatore(2)': { icon: '◈', cls: 'archetype-2' },
  'Conquistatore(3)': { icon: '◆', cls: 'archetype-3' },
  'Individualista(4)': { icon: '◇', cls: 'archetype-4' },
  'Architetto(5)': { icon: '⌬', cls: 'archetype-5' },
  'Lealista(6)': { icon: '◬', cls: 'archetype-6' },
  'Esploratore(7)': { icon: '✦', cls: 'archetype-7' },
  'Cacciatore(8)': { icon: '⬢', cls: 'archetype-8' },
  'Stoico(9)': { icon: '○', cls: 'archetype-9' },
};

// SPEC-N PR-5 (NF3): archetype + beat labels migrated to the i18n loader
// (data/i18n SSOT). IT values unchanged (ennea_archetype/ennea_beat.it == old
// hardcoded maps); EN now covered. Archetype number parsed from id parens.
export function archetypeLabel(archetypeId) {
  const m = /\((\d)\)/.exec(String(archetypeId || ''));
  if (!m) return '';
  const key = `ennea_archetype.${m[1]}`;
  const label = t(key);
  return label === key ? '' : label;
}

// Pure: beat_id -> IT label via i18n; raw beat_id fallback if unknown.
export function beatLabel(beatId) {
  const id = String(beatId || '');
  if (!id) return '';
  const key = `ennea_beat.${id}`;
  const label = t(key);
  return label === key ? id : label;
}

// Pure: voice payload → HTML card. Empty string se payload invalido.
export function formatVoiceLine(voice) {
  if (!voice || typeof voice !== 'object') return '';
  const archetypeId = String(voice.archetype_id || '').trim();
  const text = String(voice.text || '').trim();
  const actorId = String(voice.actor_id || '').trim();
  if (!archetypeId || !text) return '';
  const meta = ARCHETYPE_META[archetypeId];
  if (!meta) return '';
  const label = archetypeLabel(archetypeId);
  const beatId = String(voice.beat_id || '').trim();
  const beatText = beatLabel(beatId);
  const actorAttr = actorId ? ` data-actor-id="${escapeHtml(actorId)}"` : '';
  const beatHtml = beatText
    ? `<span class="db-ennea-voice-beat">${escapeHtml(beatText)}</span>`
    : '';
  return `<div class="db-ennea-voice ${meta.cls}"${actorAttr}>
    <div class="db-ennea-voice-header">
      <span class="db-ennea-voice-icon">${meta.icon}</span>
      <span class="db-ennea-voice-label">${escapeHtml(label)}</span>
      ${beatHtml}
    </div>
    <div class="db-ennea-voice-text">"${renderMbtiTaggedHtml(text, null, { forceReveal: true })}"</div>
  </div>`;
}

// Pure: array of voice payloads → HTML list of cards. Filter invalid.
export function formatVoiceList(voices) {
  if (!Array.isArray(voices) || voices.length === 0) return '';
  const items = voices.map(formatVoiceLine).filter(Boolean).join('');
  return items;
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c],
  );
}

// Side effect: render voice list into list container + show/hide
// section parent. Idempotent — sostituisce innerHTML.
//   sectionEl = #db-ennea-voices-section
//   listEl    = #db-ennea-voices-list
//   payload   = ennea_voices array | null
export function renderEnneaVoices(sectionEl, listEl, payload) {
  if (!sectionEl || !listEl) return;
  const html = formatVoiceList(payload);
  if (!html) {
    sectionEl.style.display = 'none';
    listEl.innerHTML = '';
    return;
  }
  sectionEl.style.display = '';
  listEl.innerHTML = html;
}

// Test hook: expose ARCHETYPE_META (icon + cls) for palette tests.
export const _internals = {
  ARCHETYPE_META,
};
