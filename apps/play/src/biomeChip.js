// Sprint 11 (Surface-DEAD #6) — Biome chip HUD surface.
//
// Engine LIVE: apps/backend/services/combat/biomeSpawnBias.js applica boost
// pesi spawn pool basato su biome affinity. apps/backend/services/combat/
// biomePoolLoader.js fornisce role_templates per biome. session.biome_id
// viene popolato in /start.
//
// Surface DEAD pre-Sprint 11: nessun frontend mostrava il biome corrente.
// Player non sapeva quale ambiente stava giocando — perdeva la lettura
// tattica (specie endemiche favorite, hazard ambientali, strategia).
//
// Surface NEW: chip in HUD next to objective bar mostra `🌍 SAVANA` (caps
// label da biome_id). Tooltip on hover (future: full codex page).
// Hidden quando biome_id null (graceful degrade).

'use strict';

// SPEC-N PR-5 (NF3): label-maps migrated to the i18n loader (data/i18n SSOT).
// IT values unchanged (biome_label/biome_eco.it == old hardcoded maps); EN now covered.
import { t } from './i18n.js';

const BIOME_ICONS = {
  savana: '🌾',
  caverna: '🕳',
  caverna_risonante: '🔊',
  caverna_sotterranea: '🕳',
  foresta: '🌳',
  pianura_aperta: '🌾',
  rovine_planari: '🏛',
  abisso_vulcanico: '🌋',
  atollo_obsidiana: '🪨',
  cattedrale_apex: '⛪',
  frattura_stellare: '✨',
};

const DEFAULT_ICON = '🌍';

// Pure: biome id → human label. Falls back to title-case se sconosciuto.
export function labelForBiome(biomeId) {
  if (!biomeId) return '';
  const key = String(biomeId).toLowerCase();
  const i18nKey = `biome_label.${key}`;
  const label = t(i18nKey);
  if (label !== i18nKey) return label;
  // Fallback: snake_case → Title Case
  return key
    .split('_')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// Pure: biome id → emoji icon. Default 🌍 globe.
export function iconForBiome(biomeId) {
  if (!biomeId) return DEFAULT_ICON;
  const key = String(biomeId).toLowerCase();
  return BIOME_ICONS[key] || DEFAULT_ICON;
}

// Pure: biomeModifiers → pressure tier classification.
// TKT-ECO-A5 (2026-05-15) — surface bioma pressure derivata da diff_base +
// hazard.stress_modifiers. Soglia: hostile se pressure_initial_bonus > 0 OR
// hp_mult > 1.0. Default biomes (savana diff_base 2) → null (chip standard).
export function pressureTier(biomeModifiers) {
  if (!biomeModifiers || typeof biomeModifiers !== 'object') return null;
  const hpMult = Number(biomeModifiers.hp_mult || 1.0);
  const pressureInit = Number(biomeModifiers.pressure_initial_bonus || 0);
  const pressurePerRound = Number(biomeModifiers.pressure_mult || 0);
  if (hpMult >= 1.15 || pressureInit >= 15 || pressurePerRound >= 3) return 'severe';
  if (hpMult > 1.0 || pressureInit > 0 || pressurePerRound > 0) return 'elevated';
  return null;
}

// Pure: ERMES eco_pressure band → diegetic IT descriptor (FASE 3 P4).
// ADR "Per il giocatore" doctrine: il nome "ERMES" non appare MAI al player.
// low = calmo, med = in equilibrio, high = in tensione. Unknown → ''.
export function ecoBandLabel(band) {
  if (!band) return '';
  const i18nKey = `biome_eco.${band}`;
  const label = t(i18nKey);
  return label === i18nKey ? '' : label;
}

// Pure: wounded flag → diegetic IT label (SPEC-P PA3, #2677 read-side).
// A13 cross-run: a biome wounded by a failed expedition reacts more harshly.
// Anti-brick doctrine (SPEC-P sez.8): degrade MUST be telegraphed, NO raw number.
// Falsy flag → '' (no marker). Hard fallback so the telegraph never shows a raw key.
export function woundedLabel(biomeWounded) {
  if (!biomeWounded) return '';
  const i18nKey = 'biome_wounded.label';
  const label = t(i18nKey);
  return label === i18nKey ? 'Bioma ferito' : label;
}

// Pure: payload → HTML chip. Returns empty string se biome_id mancante.
// Optional biomeModifiers param adds pressure indicator (TKT-ECO-A5).
// Optional ermesBand (low/med/high) adds eco descriptor (FASE 3 P4).
// Optional biomeWounded (bool) adds wounded telegraph (SPEC-P PA3, #2677).
export function formatBiomeChip(
  biomeId,
  biomeModifiers = null,
  ermesBand = null,
  biomeWounded = false,
) {
  if (!biomeId) return '';
  const icon = iconForBiome(biomeId);
  const label = labelForBiome(biomeId);
  if (!label) return '';
  const tier = pressureTier(biomeModifiers);
  const pressureHtml = tier
    ? `<span class="biome-pressure biome-pressure-${tier}" data-tier="${tier}">${tier === 'severe' ? '⚠⚠' : '⚠'}</span>`
    : '';
  const ecoLabel = ecoBandLabel(ermesBand);
  const ecoHtml = ecoLabel
    ? `<span class="biome-eco biome-eco-${ermesBand}" data-band="${ermesBand}">${escapeHtml(ecoLabel)}</span>`
    : '';
  const woundedTxt = woundedLabel(biomeWounded);
  const woundedHtml = woundedTxt
    ? `<span class="biome-wounded" data-wounded="true">🩸 ${escapeHtml(woundedTxt)}</span>`
    : '';
  return (
    `<span class="biome-icon">${icon}</span>` +
    `<span class="biome-label">${escapeHtml(label)}</span>` +
    pressureHtml +
    ecoHtml +
    woundedHtml
  );
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

// Side effect: render biome chip into HUD container element.
// Idempotent — sostituisce innerHTML. Hide via .biome-hidden class quando biome_id null.
// TKT-ECO-A5 — optional biomeModifiers param surface pressure tier indicator.
export function renderBiomeChip(
  containerEl,
  biomeId,
  biomeModifiers = null,
  ermesBand = null,
  biomeWounded = false,
) {
  if (!containerEl || typeof containerEl.innerHTML !== 'string') return;
  const html = formatBiomeChip(biomeId, biomeModifiers, ermesBand, biomeWounded);
  if (!html) {
    containerEl.innerHTML = '';
    containerEl.classList.add('biome-hidden');
    containerEl.removeAttribute('title');
    return;
  }
  containerEl.classList.remove('biome-hidden');
  containerEl.innerHTML = html;
  // Tooltip nativo: mostra biome_id raw + pressure detail se applicable.
  const tier = pressureTier(biomeModifiers);
  let tooltip = `Biome: ${biomeId} — vedi Codex per dettagli`;
  if (tier === 'severe') {
    const hp = Math.round((Number(biomeModifiers?.hp_mult || 1) - 1) * 100);
    const init = Number(biomeModifiers?.pressure_initial_bonus || 0);
    const tick = Number(biomeModifiers?.pressure_mult || 0);
    tooltip = `Bioma OSTILE: HP nemici +${hp}% / pressure init +${init} / +${tick}/round. Vedi Codex.`;
  } else if (tier === 'elevated') {
    const hp = Math.round((Number(biomeModifiers?.hp_mult || 1) - 1) * 100);
    tooltip = `Bioma stress elevato: HP nemici +${hp}%. Vedi Codex per dettagli.`;
  }
  // FASE 3 P4: eco descriptor in tooltip (diegetic, no ERMES name).
  const ecoLabel = ecoBandLabel(ermesBand);
  if (ecoLabel) {
    tooltip += ` · ${ecoLabel} (reazione del bioma ai tratti in gioco).`;
  }
  // SPEC-P PA3: wounded descriptor in tooltip (diegetic, anti-brick, no raw number).
  const woundedTxt = woundedLabel(biomeWounded);
  if (woundedTxt) {
    const wKey = 'biome_wounded.tooltip';
    const wTip = t(wKey);
    const wDesc = wTip === wKey ? 'porta le cicatrici di una spedizione fallita' : wTip;
    tooltip += ` · ${woundedTxt}: ${wDesc}.`;
  }
  containerEl.setAttribute('title', tooltip);
}
