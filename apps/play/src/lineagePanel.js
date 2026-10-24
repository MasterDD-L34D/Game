// Sprint 12 (Surface-DEAD #4) — Mating lifecycle wire.
//
// Engine LIVE: apps/backend/services/metaProgression.js (rollMatingOffspring
// + canMate gate + offspringRegistry). Backend wire: rewardEconomy.js
// buildDebriefSummary emette `mating_eligibles[]` post-victory con pair
// survivors player team.
//
// Surface DEAD pre-Sprint 12: debrief panel non emetteva offspring eligibles
// quando victory + 2+ player units survived. Player non vedeva mai pair-bond
// candidates → ciclo Nido→offspring→lineage_id invisibile in player loop.
//
// Surface NEW: section "🏠 Lineage Eligibili" in debrief con card pair-bond
// (🦎 parent_a × 🦎 parent_b → ✨ +N offspring · biome icon). Hidden quando
// payload empty / defeat / engine missing (graceful degrade).

'use strict';

import { iconForBiome, labelForBiome } from './biomeChip.js';

const DEFAULT_OFFSPRING_LABEL = 'offspring';

// Pure: pair entry → HTML card. Returns empty string se entry malformed.
export function formatLineageCard(entry) {
  if (!entry || typeof entry !== 'object') return '';
  const aId = String(entry.parent_a_id || '').trim();
  const bId = String(entry.parent_b_id || '').trim();
  if (!aId || !bId) return '';
  const aName = String(entry.parent_a_name || aId).trim() || aId;
  const bName = String(entry.parent_b_name || bId).trim() || bId;
  const biomeId = entry.biome_id || null;
  const biomeIcon = iconForBiome(biomeId);
  const biomeLabel = labelForBiome(biomeId);
  const offspringCount = Number.isFinite(Number(entry.expected_offspring_count))
    ? Math.max(1, Math.floor(Number(entry.expected_offspring_count)))
    : 1;
  const pairKey = `${aId}__${bId}`;
  const biomeChip = biomeLabel
    ? `<span class="db-lineage-biome">${biomeIcon} ${escapeHtml(biomeLabel)}</span>`
    : '';
  return (
    `<div class="db-lineage-card" data-pair-id="${escapeHtml(pairKey)}">` +
    `<div class="db-lineage-pair">` +
    `<span class="db-lineage-parent">🦎 ${escapeHtml(aName)}</span>` +
    `<span class="db-lineage-x">×</span>` +
    `<span class="db-lineage-parent">🦎 ${escapeHtml(bName)}</span>` +
    `</div>` +
    `<div class="db-lineage-meta">` +
    `<span class="db-lineage-offspring">✨ +${offspringCount} ${escapeHtml(
      offspringCount === 1 ? DEFAULT_OFFSPRING_LABEL : `${DEFAULT_OFFSPRING_LABEL}s`,
    )}</span>` +
    biomeChip +
    `</div>` +
    `</div>`
  );
}

// Pure: lista pair eligibles → HTML stack di card. Empty string se lista vuota.
export function formatLineageList(eligibles) {
  if (!Array.isArray(eligibles) || eligibles.length === 0) return '';
  return eligibles.map(formatLineageCard).filter(Boolean).join('');
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

// Side effect: render lineage section into debrief.
//   sectionEl = #db-lineage-section
//   listEl    = #db-lineage-list
//   eligibles = mating_eligibles[] | null
//
// Idempotent — sostituisce innerHTML. Hide via display:none quando empty.
export function renderLineageEligibles(sectionEl, listEl, eligibles) {
  if (!sectionEl || !listEl) return;
  const html = formatLineageList(eligibles);
  if (!html) {
    sectionEl.style.display = 'none';
    listEl.innerHTML = '';
    return;
  }
  sectionEl.style.display = '';
  listEl.innerHTML = html;
}
