// B.1.8 #3 (Sprint 7) — Disco Elysium passive→active skill check popup.
//
// Quando un trait passivo triggera durante un attack/ability event,
// surface al player via popup floating sopra l'actor con stile diegetico
// stile Disco Elysium ("ARTIGLI SETTE VIE: PASSED").
//
// Pattern matched: trait_effects[] entries con triggered=true. Layer
// frontend-only — backend già emette trait_effects in attack/ability
// events (apps/backend/services/traitEffects.js).
//
// Hook from main.js processNewEvents — see renderSkillCheckPopups().

'use strict';

// Pure transform: trait_effects array → display payload list. Skip non-triggered
// + dedupe + apply optional skip list. Exported standalone for unit tests.
export function buildSkillCheckPayload(traitEffects, opts = {}) {
  if (!Array.isArray(traitEffects)) return [];
  const skip = opts.skipTraits instanceof Set ? opts.skipTraits : new Set(opts.skipTraits || []);
  const out = [];
  const seen = new Set();
  for (const entry of traitEffects) {
    if (!entry || entry.triggered !== true) continue;
    const traitId = entry.trait || entry.token;
    if (!traitId) continue;
    if (skip.has(traitId)) continue;
    if (seen.has(traitId)) continue;
    seen.add(traitId);
    const label = formatTraitLabel(traitId);
    const tag = entry.effect && entry.effect !== 'none' ? entry.effect : null;
    out.push({ trait_id: traitId, label, effect_tag: tag });
  }
  return out;
}

// `serpente_di_terra` → `SERPENTE DI TERRA`. Plain Title Case for unknown ids,
// uppercase for Disco-tag aesthetic.
export function formatTraitLabel(traitId) {
  return String(traitId || '')
    .replace(/_/g, ' ')
    .toUpperCase()
    .trim();
}

// Side effect: schedules popup animations sopra l'actor unit.
// `pushPopupFn` injected from anim.js (decoupled per test). Stagger 220ms per popup
// così non si sovrappongono. Y-offset crescente.
//
// Args:
//   event = attack/ability event payload (with trait_effects array)
//   actor = unit object (with position {x, y})
//   pushPopupFn = (x, y, text, color) => void
//   opts = { delayMs?: number, color?: string, skipTraits?: Set<string> }
//
// Returns: number of popups scheduled (0 if no triggered traits).
export function renderSkillCheckPopups(event, actor, pushPopupFn, opts = {}) {
  if (!event || !actor || !actor.position) return 0;
  if (typeof pushPopupFn !== 'function') return 0;
  const payload = buildSkillCheckPayload(event.trait_effects, opts);
  if (payload.length === 0) return 0;
  const delayMs = Number.isFinite(opts.delayMs) ? opts.delayMs : 220;
  const color = opts.color || '#c6a0ff';
  const yOffsetStep = 0.32;
  payload.forEach((p, idx) => {
    const text = `[${p.label}]`;
    const y = actor.position.y - idx * yOffsetStep;
    if (idx === 0) {
      pushPopupFn(actor.position.x, y, text, color);
    } else {
      // Stagger via setTimeout — best-effort; failure swallowed.
      try {
        setTimeout(() => pushPopupFn(actor.position.x, y, text, color), idx * delayMs);
      } catch {
        /* timeout best-effort */
      }
    }
  });
  return payload.length;
}
