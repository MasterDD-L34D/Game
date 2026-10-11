// 2026-05-10 sera Sprint Q+ Q-9 — Offspring Ritual Panel UI surface.
// Display 6-canonical mutation cards post-mating eligibles + 3-of-6 user
// choice + POST /api/v1/lineage/offspring-ritual on confirm.
//
// Naming disambiguation: existing apps/play/src/legacyRitualPanel.js (Skiv
// Goal 4) handles death-time mutation leave choice (DIFFERENT semantic).
// Q+ Q-9 = mating offspring birth post-encounter (parallel a backend
// offspringRitual.js Q-3).
//
// Wire: debriefPanel.js section #db-offspring-ritual-section.
// Cross-stack contract: packages/contracts/schemas/lineage_ritual.schema.json (Q-1).

'use strict';

import { fetchMutationsCanonical, postOffspringRitual } from './legacyRitualApi.js';

const MAX_SELECT = 3;
const MIN_SELECT = 1;

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Pure helper — format mutation card HTML.
 * @param {object} m { id, label_it, description_it, effect_kind, ... }
 * @param {boolean} selected
 */
export function formatMutationCard(m, selected = false) {
  const cls = `db-offspring-mutation-card${selected ? ' selected' : ''}`;
  return (
    `<div class="${cls}" data-mutation-id="${escapeHtml(m.id)}">` +
    `<div class="db-offspring-mutation-name">${escapeHtml(m.label_it || m.id)}</div>` +
    `<div class="db-offspring-mutation-effect">${escapeHtml(m.effect_kind || '')}</div>` +
    `<div class="db-offspring-mutation-desc">${escapeHtml((m.description_it || '').split('\n')[0])}</div>` +
    `</div>`
  );
}

/**
 * Render mutation cards grid + confirm button.
 * @returns {{ dispose: function }}
 */
export function renderOffspringRitual(sectionEl, pair, mutations, opts = {}) {
  if (!sectionEl) return { dispose: () => {} };
  if (!Array.isArray(mutations) || mutations.length === 0) {
    sectionEl.style.display = 'none';
    return { dispose: () => {} };
  }
  sectionEl.style.display = '';
  sectionEl.innerHTML =
    `<h3 class="db-section-title">🌀 Rituale Eredità</h3>` +
    `<div class="db-offspring-mutations-grid"></div>` +
    `<div class="db-offspring-actions">` +
    `<span class="db-offspring-counter">0 / ${MAX_SELECT}</span>` +
    `<button type="button" class="db-offspring-confirm" disabled>Conferma 3 mutazioni</button>` +
    `</div>` +
    `<div class="db-offspring-result" aria-live="polite"></div>`;

  const grid = sectionEl.querySelector('.db-offspring-mutations-grid');
  const counter = sectionEl.querySelector('.db-offspring-counter');
  const confirmBtn = sectionEl.querySelector('.db-offspring-confirm');
  const resultEl = sectionEl.querySelector('.db-offspring-result');

  const selected = new Set();
  grid.innerHTML = mutations.map((m) => formatMutationCard(m, false)).join('');

  function updateUI() {
    grid.querySelectorAll('.db-offspring-mutation-card').forEach((card) => {
      const id = card.dataset.mutationId;
      card.classList.toggle('selected', selected.has(id));
    });
    counter.textContent = `${selected.size} / ${MAX_SELECT}`;
    confirmBtn.disabled = selected.size < MIN_SELECT || selected.size > MAX_SELECT;
  }

  function onCardClick(ev) {
    const card = ev.target.closest('.db-offspring-mutation-card');
    if (!card) return;
    const id = card.dataset.mutationId;
    if (!id) return;
    if (selected.has(id)) {
      selected.delete(id);
    } else if (selected.size < MAX_SELECT) {
      selected.add(id);
    }
    updateUI();
  }

  async function onConfirmClick() {
    if (confirmBtn.disabled) return;
    confirmBtn.disabled = true;
    resultEl.textContent = 'Invocazione rituale…';
    try {
      const offspring = await postOffspringRitual({
        session_id: pair.sessionId,
        parent_a_id: pair.parent_a_id,
        parent_b_id: pair.parent_b_id,
        mutations: Array.from(selected),
      });
      resultEl.innerHTML = `<span class="db-offspring-success">✨ Offspring nato: <code>${escapeHtml(
        offspring.id,
      )}</code> · lineage <code>${escapeHtml(offspring.lineage_id)}</code></span>`;
      grid.style.pointerEvents = 'none';
      grid.style.opacity = '0.5';
      if (typeof opts.onSuccess === 'function') opts.onSuccess(offspring);
    } catch (err) {
      resultEl.innerHTML = `<span class="db-offspring-error">⚠ ${escapeHtml(err.message || 'errore')}</span>`;
      confirmBtn.disabled = false;
      if (typeof opts.onError === 'function') opts.onError(err);
    }
  }

  grid.addEventListener('click', onCardClick);
  confirmBtn.addEventListener('click', onConfirmClick);

  return {
    dispose() {
      grid.removeEventListener('click', onCardClick);
      confirmBtn.removeEventListener('click', onConfirmClick);
    },
  };
}

/**
 * Convenience: load mutations canonical + render. Async.
 */
export async function setupOffspringRitual(sectionEl, pair, opts = {}) {
  if (!sectionEl || !pair || !pair.sessionId || !pair.parent_a_id || !pair.parent_b_id) {
    if (sectionEl) sectionEl.style.display = 'none';
    return null;
  }
  try {
    const data = await fetchMutationsCanonical();
    const mutations = (data.ids || []).map((id) => ({ id, ...(data.mutations[id] || {}) }));
    return renderOffspringRitual(sectionEl, pair, mutations, opts);
  } catch (err) {
    sectionEl.innerHTML = `<div class="db-offspring-error">⚠ Caricamento mutazioni fallito: ${escapeHtml(err.message || 'errore')}</div>`;
    return null;
  }
}
