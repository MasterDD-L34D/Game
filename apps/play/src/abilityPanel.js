// Ability panel — fetch /api/jobs, render clickable abilities per unit selezionata.

import { api } from './api.js';

let jobCache = null;

async function loadJobs() {
  if (jobCache) return jobCache;
  const r = await fetch('/api/jobs')
    .then((res) => res.json())
    .catch(() => null);
  if (r && Array.isArray(r.jobs)) {
    jobCache = {};
    for (const j of r.jobs) jobCache[j.id] = j;
  }
  return jobCache || {};
}

async function loadJobDetail(jobId) {
  const r = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`)
    .then((res) => res.json())
    .catch(() => null);
  return r;
}

export async function renderAbilities(unit, state, onAbility) {
  const titleEl = document.getElementById('abilities-title');
  const container = document.getElementById('abilities');
  container.innerHTML = '';
  if (!unit || !unit.job) {
    titleEl.classList.add('hidden-empty');
    return;
  }
  titleEl.classList.remove('hidden-empty');

  const detail = await loadJobDetail(unit.job);
  if (!detail || !Array.isArray(detail.abilities) || detail.abilities.length === 0) {
    container.innerHTML = `<div class="ab-empty">Nessuna ability per ${unit.job}</div>`;
    return;
  }

  titleEl.textContent = `Abilities · ${unit.job}`;
  for (const ab of detail.abilities) {
    const row = document.createElement('div');
    row.className = 'ability-row';
    const apCost = ab.cost_ap ?? ab.ap_cost ?? 1;
    const apCurrent = unit.ap_remaining ?? unit.ap;
    const canAfford = apCurrent >= apCost;
    row.classList.toggle('disabled', !canAfford);

    const needsTarget =
      !!ab.needs_target ||
      ['attack', 'debuff', 'heal', 'aoe_debuff'].some(
        (t) => ab.effect_type && ab.effect_type.includes(t),
      );

    row.innerHTML = `
      <div class="ab-head">
        <strong>${ab.label_it || ab.label || ab.id}</strong>
        <span class="ab-cost">AP ${apCost}</span>
      </div>
      <div class="ab-effect">${ab.effect_type || ''} ${ab.description_it || ab.description || ''}</div>
    `;
    row.addEventListener('click', () => {
      if (!canAfford) return;
      onAbility({ ability_id: ab.id, needs_target: needsTarget, effect_type: ab.effect_type });
    });
    container.appendChild(row);
  }
}

export function clearAbilities() {
  const titleEl = document.getElementById('abilities-title');
  const container = document.getElementById('abilities');
  if (titleEl) titleEl.classList.add('hidden-empty');
  if (container) container.innerHTML = '';
}

// preload on module load (non bloccante)
loadJobs();
