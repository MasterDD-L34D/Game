// Sprint β Visual UX 2026-04-28 — Portrait-as-status (CK3 pattern).
//
// Pattern donor: Crusader Kings 3 — character portraits che cambiano
// expression in base allo stato (panic/rage/focused/bleeding). Sub-panel
// montato in characterPanel via slot. Static portrait per MBTI form (16
// base) con fallback emoji se PNG asset non disponibile.
//
// Asset path convention: public/assets/portraits/<form_id_or_mbti>.png
//   - INTJ.png, INTP.png, ..., ESFP.png (16 MBTI forms)
//   - Fallback emoji se manca (graceful degradation)
//
// Status-overlay emoji priority (top-of-stack vince):
//   panic 😱 > rage 😡 > bleeding 🩸 > stunned 💫 > focused 🎯 > confused ❓
//
// Pure functions exportate per test (jsdom-free):
//   - resolvePortraitPath(form_id|mbti)        → string
//   - resolveStatusOverlay(status_obj)         → { emoji, label } | null
//   - buildPortraitMarkup(unit)                → HTML string
//
// Entry point browser:
//   - renderPortraitPanel(rootEl, unit)        → side-effect DOM mount
//   - clearPortraitPanel(rootEl)               → cleanup

const PORTRAIT_BASE = '/assets/portraits/';

// 16 MBTI forms canonical (mirror docs/core/PI-Pacchetti-Forme.md).
const MBTI_FORMS = [
  'INTJ',
  'INTP',
  'ENTJ',
  'ENTP',
  'INFJ',
  'INFP',
  'ENFJ',
  'ENFP',
  'ISTJ',
  'ISFJ',
  'ESTJ',
  'ESFJ',
  'ISTP',
  'ISFP',
  'ESTP',
  'ESFP',
];

// Status → emoji overlay (CK3 expression mood). Priority order top-down.
const STATUS_OVERLAY_PRIORITY = [
  { key: 'panic', emoji: '😱', label: 'Panico' },
  { key: 'rage', emoji: '😡', label: 'Furia' },
  { key: 'bleeding', emoji: '🩸', label: 'Sanguina' },
  { key: 'stunned', emoji: '💫', label: 'Stordito' },
  { key: 'focused', emoji: '🎯', label: 'Focalizzato' },
  { key: 'confused', emoji: '❓', label: 'Confuso' },
];

// Default per-MBTI fallback emoji (cuando asset PNG manca).
const MBTI_FALLBACK_EMOJI = {
  INTJ: '🧠',
  INTP: '🔬',
  ENTJ: '👑',
  ENTP: '🎲',
  INFJ: '🌌',
  INFP: '🌸',
  ENFJ: '🤝',
  ENFP: '🎉',
  ISTJ: '📋',
  ISFJ: '🛡️',
  ESTJ: '⚖️',
  ESFJ: '🍀',
  ISTP: '🔧',
  ISFP: '🎨',
  ESTP: '⚡',
  ESFP: '🎭',
};

/**
 * Resolve PNG path per MBTI form.
 * @param {string} formOrMbti - "INTJ" | "ESFP" | (form_id arbitrary)
 * @returns {string} absolute path under public/
 */
export function resolvePortraitPath(formOrMbti) {
  if (!formOrMbti || typeof formOrMbti !== 'string') {
    return `${PORTRAIT_BASE}default.png`;
  }
  const upper = formOrMbti.toUpperCase();
  if (MBTI_FORMS.includes(upper)) {
    return `${PORTRAIT_BASE}${upper}.png`;
  }
  return `${PORTRAIT_BASE}default.png`;
}

/**
 * Resolve emoji fallback per MBTI form (used quando asset PNG manca).
 * @param {string} formOrMbti
 * @returns {string} single emoji
 */
export function resolveFallbackEmoji(formOrMbti) {
  if (!formOrMbti || typeof formOrMbti !== 'string') return '👤';
  const upper = formOrMbti.toUpperCase();
  return MBTI_FALLBACK_EMOJI[upper] || '👤';
}

/**
 * Resolve top-priority status overlay (return primo match nella priority list).
 * @param {object|null|undefined} statusObj - { panic: 2, rage: 0, bleeding: 1, ... }
 * @returns {{emoji: string, label: string, key: string} | null}
 */
export function resolveStatusOverlay(statusObj) {
  if (!statusObj || typeof statusObj !== 'object') return null;
  for (const entry of STATUS_OVERLAY_PRIORITY) {
    const v = statusObj[entry.key];
    if (v !== undefined && v !== null && (typeof v !== 'number' || v > 0)) {
      return { emoji: entry.emoji, label: entry.label, key: entry.key };
    }
  }
  return null;
}

/**
 * Build HTML markup for portrait panel.
 * Pure function (no DOM side-effects). Used by renderPortraitPanel + tests.
 * @param {object|null} unit
 * @returns {string} HTML
 */
export function buildPortraitMarkup(unit) {
  if (!unit) {
    return '<div class="portrait-empty">Nessun PG selezionato.</div>';
  }
  const mbti = unit.mbti_type || unit.form_id || 'default';
  const portraitPath = resolvePortraitPath(mbti);
  const fallback = resolveFallbackEmoji(mbti);
  const overlay = resolveStatusOverlay(unit.status);
  const overlayHtml = overlay
    ? `<div class="portrait-emotion ${overlay.key}" title="${overlay.label}" data-emotion="${overlay.key}">${overlay.emoji}</div>`
    : '';
  // Img onerror swap → fallback emoji glyph (graceful degradation).
  const safeMbti = String(mbti).replace(/[<>"']/g, '');
  return `
    <div class="portrait-panel" data-mbti="${safeMbti}">
      <div class="portrait-frame">
        <img class="portrait-img"
             src="${portraitPath}"
             alt="Ritratto ${safeMbti}"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
        <div class="portrait-fallback" style="display:none;">${fallback}</div>
        ${overlayHtml}
      </div>
      <div class="portrait-caption">
        <span class="portrait-mbti">${safeMbti}</span>
        ${overlay ? `<span class="portrait-mood">${overlay.label}</span>` : ''}
      </div>
    </div>
  `;
}

/**
 * Mount portrait panel inside rootEl. Idempotent — safe to call repeatedly.
 * @param {HTMLElement|null} rootEl - DOM container
 * @param {object|null} unit
 */
export function renderPortraitPanel(rootEl, unit) {
  if (!rootEl) return;
  rootEl.innerHTML = buildPortraitMarkup(unit);
}

/**
 * Clear portrait panel content.
 * @param {HTMLElement|null} rootEl
 */
export function clearPortraitPanel(rootEl) {
  if (!rootEl) return;
  rootEl.innerHTML = '';
}

// Test-only helpers (export per spec coverage)
export const __testHelpers = {
  MBTI_FORMS,
  STATUS_OVERLAY_PRIORITY,
  MBTI_FALLBACK_EMOJI,
};
