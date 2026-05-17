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

// Pure: biome_id → IT label umano. Mappa canonical, fallback caps trasformazione.
const BIOME_LABELS = {
  savana: 'Savana',
  caverna: 'Caverna',
  caverna_risonante: 'Caverna risonante',
  caverna_sotterranea: 'Caverna sotterranea',
  foresta: 'Foresta',
  pianura_aperta: 'Pianura aperta',
  rovine_planari: 'Rovine planari',
  abisso_vulcanico: 'Abisso vulcanico',
  atollo_obsidiana: 'Atollo di Obsidiana',
  cattedrale_apex: "Cattedrale dell'Apex",
  frattura_stellare: 'Frattura stellare',
};

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
  if (BIOME_LABELS[key]) return BIOME_LABELS[key];
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

// Pure: payload → HTML chip. Returns empty string se biome_id mancante.
// Optional biomeModifiers param adds pressure indicator (TKT-ECO-A5).
export function formatBiomeChip(biomeId, biomeModifiers = null) {
  if (!biomeId) return '';
  const icon = iconForBiome(biomeId);
  const label = labelForBiome(biomeId);
  if (!label) return '';
  const tier = pressureTier(biomeModifiers);
  const pressureHtml = tier
    ? `<span class="biome-pressure biome-pressure-${tier}" data-tier="${tier}">${tier === 'severe' ? '⚠⚠' : '⚠'}</span>`
    : '';
  return (
    `<span class="biome-icon">${icon}</span>` +
    `<span class="biome-label">${escapeHtml(label)}</span>` +
    pressureHtml
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
export function renderBiomeChip(containerEl, biomeId, biomeModifiers = null) {
  if (!containerEl || typeof containerEl.innerHTML !== 'string') return;
  const html = formatBiomeChip(biomeId, biomeModifiers);
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
  containerEl.setAttribute('title', tooltip);
}
