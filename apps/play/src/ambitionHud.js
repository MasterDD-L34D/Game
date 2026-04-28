// Action 6 (ADR-2026-04-28 §Action 6) — Ambition HUD top-bar.
//
// Engine LIVE: apps/backend/services/campaign/ambitionService.js
//   tracks long-arc campaign goal progress (progress/progress_target).
// Surface: this strip in HUD next to ct-bar / biome-chip / objective-bar.
//
// Pattern mirror: biomeChip.js (pure helpers + side-effect render),
// objectivePanel idempotent. Hide gracefully se ambitions empty.
//
// Pulse on progress increment: CSS class .ambition-pulse one-shot animation.
// Choice ritual modal triggered separately by ambitionChoicePanel.js when
// choice_ready=true.

'use strict';

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

// Pure: ambition entry → HUD label string.
// Format from ambition.ui_overlay.format placeholder substitution.
export function formatAmbitionLabel(ambition) {
  if (!ambition) return '';
  const fmt = ambition.ui_overlay?.format || '🤝 {progress}/{progress_target}';
  const progress = Number(ambition.progress) || 0;
  const target = Number(ambition.progress_target) || 0;
  return String(fmt)
    .replace('{progress}', String(progress))
    .replace('{progress_target}', String(target));
}

// Pure: ambition list → HTML string. Empty list → ''.
export function formatAmbitionHud(ambitions) {
  if (!Array.isArray(ambitions) || ambitions.length === 0) return '';
  return ambitions
    .map((a) => {
      const label = formatAmbitionLabel(a);
      const ready = a.choice_ready ? ' ambition-ready' : '';
      return (
        `<span class="ambition-pill${ready}" data-ambition-id="${escapeHtml(a.ambition_id)}">` +
        `<span class="ambition-label">${escapeHtml(label)}</span>` +
        (a.choice_ready ? '<span class="ambition-cta">✦ Rituale</span>' : '') +
        `</span>`
      );
    })
    .join('');
}

// Track previous progress per ambition_id to detect increments → pulse.
const _lastProgress = new Map();

// Side effect: render ambition strip into container.
// Idempotent. Hide via .ambition-hidden when empty. Pulse on progress++.
export function renderAmbitionHud(containerEl, ambitions) {
  if (!containerEl || typeof containerEl.innerHTML !== 'string') return;
  if (!Array.isArray(ambitions) || ambitions.length === 0) {
    containerEl.innerHTML = '';
    if (containerEl.classList && typeof containerEl.classList.add === 'function') {
      containerEl.classList.add('ambition-hidden');
    }
    return;
  }
  const html = formatAmbitionHud(ambitions);
  containerEl.innerHTML = html;
  if (containerEl.classList && typeof containerEl.classList.remove === 'function') {
    containerEl.classList.remove('ambition-hidden');
  }
  // Pulse logic: compare progress vs previous, add class if increased.
  for (const a of ambitions) {
    const prev = _lastProgress.get(a.ambition_id) || 0;
    if ((a.progress || 0) > prev) {
      // Apply pulse class (one-shot CSS animation handles cleanup).
      const querySelector =
        typeof containerEl.querySelector === 'function' ? containerEl.querySelector : null;
      if (querySelector) {
        const pill = containerEl.querySelector(`[data-ambition-id="${a.ambition_id}"]`);
        if (pill && pill.classList) pill.classList.add('ambition-pulse');
      }
    }
    _lastProgress.set(a.ambition_id, a.progress || 0);
  }
}

// Test/internal — clear pulse memory between tests.
export function _resetAmbitionHudState() {
  _lastProgress.clear();
}
