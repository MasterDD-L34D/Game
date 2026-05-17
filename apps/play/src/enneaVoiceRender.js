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

// Mapping archetype_id → metadata UI (icon + label + color).
// Color = Disco-Elysium thought cabinet aesthetic (subtle gradient bg).
const ARCHETYPE_META = {
  'Riformatore(1)': { icon: '◉', label: 'Riformatore', cls: 'archetype-1' },
  'Coordinatore(2)': { icon: '◈', label: 'Coordinatore', cls: 'archetype-2' },
  'Conquistatore(3)': { icon: '◆', label: 'Conquistatore', cls: 'archetype-3' },
  'Individualista(4)': { icon: '◇', label: 'Individualista', cls: 'archetype-4' },
  'Architetto(5)': { icon: '⌬', label: 'Architetto', cls: 'archetype-5' },
  'Lealista(6)': { icon: '◬', label: 'Lealista', cls: 'archetype-6' },
  'Esploratore(7)': { icon: '✦', label: 'Esploratore', cls: 'archetype-7' },
  'Cacciatore(8)': { icon: '⬢', label: 'Cacciatore', cls: 'archetype-8' },
  'Stoico(9)': { icon: '○', label: 'Stoico', cls: 'archetype-9' },
};

// Beat label IT per UI tooltip / hint.
const BEAT_LABEL_IT = {
  victory_solo: 'Vittoria',
  defeat_critical: 'Sconfitta',
  combat_attack_committed: 'Attacco',
  combat_defense_braced: 'Difesa',
  exploration_new_tile: 'Esplorazione',
  low_hp_warning: 'Crisi',
};

// Pure: voice payload → HTML card. Empty string se payload invalido.
export function formatVoiceLine(voice) {
  if (!voice || typeof voice !== 'object') return '';
  const archetypeId = String(voice.archetype_id || '').trim();
  const text = String(voice.text || '').trim();
  const actorId = String(voice.actor_id || '').trim();
  if (!archetypeId || !text) return '';
  const meta = ARCHETYPE_META[archetypeId];
  if (!meta) return '';
  const beatId = String(voice.beat_id || '').trim();
  const beatLabel = BEAT_LABEL_IT[beatId] || beatId;
  const actorAttr = actorId ? ` data-actor-id="${escapeHtml(actorId)}"` : '';
  const beatHtml = beatLabel
    ? `<span class="db-ennea-voice-beat">${escapeHtml(beatLabel)}</span>`
    : '';
  return `<div class="db-ennea-voice ${meta.cls}"${actorAttr}>
    <div class="db-ennea-voice-header">
      <span class="db-ennea-voice-icon">${meta.icon}</span>
      <span class="db-ennea-voice-label">${escapeHtml(meta.label)}</span>
      ${beatHtml}
    </div>
    <div class="db-ennea-voice-text">"${escapeHtml(text)}"</div>
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

// Test hook: expose ARCHETYPE_META + BEAT_LABEL_IT for parity tests.
export const _internals = {
  ARCHETYPE_META,
  BEAT_LABEL_IT,
};
