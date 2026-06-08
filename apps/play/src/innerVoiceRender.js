// 2026-05-30 TKT-P4-DIALOGUE-COLORS — Inner voice debrief render.
//
// Engine LIVE: apps/backend/services/narrative/innerVoice.js
// (evaluateVoiceTriggers + describeVoice) + data/core/thoughts/inner_voices.yaml
// (24 voices = 4 MBTI axes × 2 directions × 3 tiers). Wired into
// rewardEconomy.buildDebriefSummary → debrief.inner_voices = [{ actor_id,
// voice_id, axis, direction, mbti_pole, tier, label, text }, ...].
//
// Surface DEAD pre-2026-05-30: the debrief panel never rendered inner voices —
// the Disco-Elysium internal monologue was invisible (Engine LIVE Surface DEAD).
//
// Surface NEW: debrief panel shows the actor's MBTI-tinted inner monologue,
// color-coded per axis (WCAG AA palette via renderMbtiTaggedHtml forceReveal).

'use strict';

// Color-coding: backend wraps `voice_it` in `<mbti axis="X">...</mbti>` via
// mbtiTaggedLine; here we colorize it (forceReveal — the voice IS the reveal).
import { renderMbtiTaggedHtml } from './dialogueRender.js';
import { t } from './i18n.js';

// SPEC-N PR-5 (NF3): tier label migrated to the i18n loader (data/i18n SSOT).
// IT values unchanged (voice_tier.it == old TIER_LABEL_IT); EN now covered.
// Pure: tier -> IT label via i18n; raw tier fallback if unknown.
export function tierLabel(tier) {
  const id = String(tier || '');
  if (!id) return '';
  const key = `voice_tier.${id}`;
  const label = t(key);
  return label === key ? id : label;
}

// Pure: inner voice payload → HTML card. Empty string if payload invalid.
export function formatInnerVoiceLine(voice) {
  if (!voice || typeof voice !== 'object') return '';
  const text = String(voice.text || '').trim();
  if (!text) return '';
  const pole = String(voice.mbti_pole || '').trim();
  const poleCls = /^[EISNTFJP]$/.test(pole) ? ` mbti-pole-${pole}` : '';
  const poleAttr = pole ? ` data-mbti-pole="${escapeHtml(pole)}"` : '';
  const actorId = String(voice.actor_id || '').trim();
  const actorAttr = actorId ? ` data-actor-id="${escapeHtml(actorId)}"` : '';
  const axis = String(voice.axis || '').trim();
  const axisAttr = axis ? ` data-axis="${escapeHtml(axis)}"` : '';
  const label = String(voice.label || '').trim();
  const tier = String(voice.tier || '').trim();
  const tierText = tierLabel(tier);
  const labelHtml = label ? `<span class="db-inner-voice-label">${escapeHtml(label)}</span>` : '';
  const tierHtml = tierText
    ? `<span class="db-inner-voice-tier">${escapeHtml(tierText)}</span>`
    : '';
  const poleIcon = pole ? `<span class="db-inner-voice-pole">${escapeHtml(pole)}</span>` : '';
  return `<div class="db-inner-voice${poleCls}"${actorAttr}${poleAttr}${axisAttr}>
    <div class="db-inner-voice-header">
      ${poleIcon}
      ${labelHtml}
      ${tierHtml}
    </div>
    <div class="db-inner-voice-text">"${renderMbtiTaggedHtml(text, null, { forceReveal: true })}"</div>
  </div>`;
}

// Pure: array of inner voice payloads → HTML list. Filters invalid.
export function formatInnerVoiceList(voices) {
  if (!Array.isArray(voices) || voices.length === 0) return '';
  return voices.map(formatInnerVoiceLine).filter(Boolean).join('');
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

// Side effect: render inner voice list into list container + show/hide section
// parent. Idempotent — replaces innerHTML.
//   sectionEl = #db-inner-voices-section
//   listEl    = #db-inner-voices-list
//   payload   = inner_voices array | null
export function renderInnerVoices(sectionEl, listEl, payload) {
  if (!sectionEl || !listEl) return;
  const html = formatInnerVoiceList(payload);
  if (!html) {
    sectionEl.style.display = 'none';
    listEl.innerHTML = '';
    return;
  }
  sectionEl.style.display = '';
  listEl.innerHTML = html;
}

// tierLabel() is exported directly above for i18n parity tests (SPEC-N PR-5).
