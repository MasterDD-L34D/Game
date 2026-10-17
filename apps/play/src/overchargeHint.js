// Gate-5 #2716 — Overcharge first-use diegetic hint (web surface).
//
// Engine LIVE: apps/backend/services/combat/overchargeEngine.js — spend a full
// SG gauge (3) for +1 AP this turn ("borrow tempo"). OD-058 D1 evidence
// (docs/reports/2026-06-10-overcharge-action-economy-n40-evidence.md) ratified
// as-built the strategic coupling: faster kills feed sistema_pressure and
// escalate reinforcements. The player sees the AP bought (gauge) but not that
// cost — this micro-hint telegraphs it at the FIRST overcharge of the run.
//
// Doctrine (issue #2716): wording diegetico, MAI meccanico, niente numeri raw
// (ER3-style). Pattern: biomeChip label hard-fallback + stresswave telegraph
// (#2712 — additive publicSessionView field -> state.world -> refresh hook).
//
// Detection = witnessed false->true transition of world.overcharge_used_this_run
// between two state snapshots of the SAME session. No prev snapshot (first
// fetch / rejoin) → the moment already passed, stay silent. Shown once per run
// (session_id-keyed), reset only on page reload or a new run.

'use strict';

import { t } from './i18n.js';

const TOAST_MS = 6000;

// Runs (session ids) the hint already fired for in this page load.
const shownForRun = new Set();

export function _resetOverchargeHintForTest() {
  shownForRun.clear();
}

// Pure: diegetic IT label. i18n key `overcharge_hint.label` with hard fallback
// so the telegraph never shows a raw key (biomeChip woundedLabel pattern).
export function overchargeHintLabel() {
  const i18nKey = 'overcharge_hint.label';
  const label = t(i18nKey);
  return label === i18nKey ? 'Il Sistema reagisce al tuo tempo rubato' : label;
}

// Pure: did THIS client witness the first overcharge of the run?
// Requires both snapshots, same session, flag flipping false -> true.
export function shouldShowOverchargeHint(prevWorld, world) {
  if (!prevWorld || !world) return false;
  if (prevWorld.session_id && world.session_id && prevWorld.session_id !== world.session_id) {
    return false;
  }
  return !prevWorld.overcharge_used_this_run && !!world.overcharge_used_this_run;
}

// Side effect: show the one-shot toast. Returns true when the hint fired
// (even headless — the once-per-run mark must hold without a DOM).
// `doc` injectable for tests; defaults to the browser document.
export function maybeShowOverchargeHint(
  prevWorld,
  world,
  doc = typeof document !== 'undefined' ? document : null,
) {
  if (!shouldShowOverchargeHint(prevWorld, world)) return false;
  const runKey = world.session_id || 'unknown-run';
  if (shownForRun.has(runKey)) return false;
  shownForRun.add(runKey);
  if (!doc || !doc.body || typeof doc.createElement !== 'function') return true;
  const el = doc.createElement('div');
  el.className = 'overcharge-hint-toast';
  el.setAttribute('role', 'status');
  el.textContent = `⚡ ${overchargeHintLabel()}`;
  doc.body.appendChild(el);
  const timer = setTimeout(() => {
    try {
      el.remove();
    } catch {
      /* already gone */
    }
  }, TOAST_MS);
  // Node test runner: don't hold the event loop open for the auto-dismiss.
  if (timer && typeof timer.unref === 'function') timer.unref();
  return true;
}
