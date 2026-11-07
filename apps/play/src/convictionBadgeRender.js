// 2026-05-30 TKT-P4-CONVICTION-BADGES — conviction badge debrief render.
//
// Engine LIVE: apps/backend/services/mbtiSurface.js buildConvictionBadges /
// buildConvictionBadgesMap (Triangle Strategy "Conviction" pattern — a decisive
// MBTI axis manifests as a color-coded badge). Wired into
// rewardEconomy.buildDebriefSummary → debrief.mbti_surface.conviction_badges.
//
// Surface DEAD pre-2026-05-30: the only renderer was a transient in-combat
// flash overlay (characterPanel.flashConvictionBadge). The debrief panel — where
// the player reflects post-combat — never showed convictions. This adds a
// persistent debrief section.
//
// Badge shape: { axis, letter, label, axis_label, color, color_name,
//                confidence, value, delta }.

'use strict';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// Pure: conviction badge → HTML chip. Empty string if invalid.
export function formatConvictionBadge(badge) {
  if (!badge || typeof badge !== 'object') return '';
  const letter = String(badge.letter || '').trim();
  const axisLabel = String(badge.axis_label || '').trim();
  if (!letter && !axisLabel) return '';
  const poleLabel = String(badge.label || badge.pole_label || '').trim();
  const axis = String(badge.axis || '').trim();
  // Color is only trusted when it matches a strict 6-digit hex (anti-injection).
  const color = HEX_COLOR_RE.test(String(badge.color || '')) ? String(badge.color) : null;
  const colorStyle = color ? ` style="color:${color}"` : '';
  const borderStyle = color ? ` style="border-color:${color}"` : '';
  const axisAttr = axis ? ` data-axis="${escapeHtml(axis)}"` : '';
  const delta = formatDelta(badge.delta);
  const deltaHtml = delta ? `<span class="cv-delta">${escapeHtml(delta)}</span>` : '';
  const letterHtml = letter
    ? `<span class="cv-letter"${colorStyle}>${escapeHtml(letter)}</span>`
    : '';
  const axisHtml = axisLabel ? `<span class="cv-axis-label">${escapeHtml(axisLabel)}</span>` : '';
  const poleHtml = poleLabel ? `<span class="cv-pole-label">${escapeHtml(poleLabel)}</span>` : '';
  return `<div class="db-conviction-badge"${axisAttr}${borderStyle}>
    ${letterHtml}
    ${axisHtml}
    ${poleHtml}
    ${deltaHtml}
  </div>`;
}

// Pure: per-actor map { uid: [badges] } OR flat array → HTML list.
export function formatConvictionBadgeList(payload) {
  const flat = flattenBadges(payload);
  if (flat.length === 0) return '';
  return flat.map(formatConvictionBadge).filter(Boolean).join('');
}

function flattenBadges(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload === 'object') {
    const out = [];
    for (const v of Object.values(payload)) {
      if (Array.isArray(v)) out.push(...v);
    }
    return out;
  }
  return [];
}

// Scale delta (0..1 fraction) to a signed integer (×100), matching the
// in-combat characterPanel badge. null/invalid → ''.
function formatDelta(delta) {
  if (delta === null || delta === undefined) return '';
  const n = Number(delta);
  if (!Number.isFinite(n) || n === 0) return '';
  const sign = n > 0 ? '+' : '';
  return `${sign}${Math.round(n * 100)}`;
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

// Side effect: render badges into list container + show/hide section parent.
// Idempotent — replaces innerHTML.
//   sectionEl = #db-conviction-section
//   listEl    = #db-conviction-list
//   payload   = conviction_badges map | flat array | null
export function renderConvictionBadges(sectionEl, listEl, payload) {
  if (!sectionEl || !listEl) return;
  const html = formatConvictionBadgeList(payload);
  if (!html) {
    sectionEl.style.display = 'none';
    listEl.innerHTML = '';
    return;
  }
  sectionEl.style.display = '';
  listEl.innerHTML = html;
}
