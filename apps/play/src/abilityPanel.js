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

// Token per prevent async race condition duplicate append.
// Ogni call incrementa _renderToken; fetch callback controlla se ancora valido.
let _renderToken = 0;

export async function renderAbilities(unit, state, onAbility) {
  const titleEl = document.getElementById('abilities-title');
  const container = document.getElementById('abilities');
  const myToken = ++_renderToken;
  container.innerHTML = '';
  if (!unit || !unit.job) {
    titleEl.classList.add('hidden-empty');
    return;
  }
  titleEl.classList.remove('hidden-empty');

  const detail = await loadJobDetail(unit.job);
  // Abort se altra chiamata già in corso (ha superato questo token)
  if (myToken !== _renderToken) return;
  if (!detail || !Array.isArray(detail.abilities) || detail.abilities.length === 0) {
    container.innerHTML = `<div class="ab-empty">Nessuna ability per ${unit.job}</div>`;
    return;
  }
  // Clear ancora prima append (sicurezza contro fetch precedenti in volo)
  container.innerHTML = '';

  titleEl.textContent = `Abilities · ${unit.job}`;
  for (const ab of detail.abilities) {
    const abilityId = ab.ability_id || ab.id;
    const label = ab.name_it || ab.label_it || ab.name || ab.label || abilityId || '???';
    const desc = ab.description_it || ab.description_en || ab.description || '';
    const apCost = ab.cost_ap ?? ab.ap_cost ?? 1;

    const row = document.createElement('div');
    row.className = 'ability-row';
    const apCurrent = unit.ap_remaining ?? unit.ap;
    const canAfford = apCurrent >= apCost;
    row.classList.toggle('disabled', !canAfford);

    // target semantic: 'enemy' | 'ally' | 'self' | 'aoe_enemies' | ...
    const tgt = ab.target || '';
    const needsEnemyTarget = tgt === 'enemy' || tgt.includes('enemy');
    const needsAllyTarget = tgt === 'ally' || tgt === 'ally_or_self';
    const needsTarget = needsEnemyTarget || needsAllyTarget;
    // effect_type che richiedono anche position (move destination)
    const effectType = ab.effect_type || '';
    const needsPosition = effectType === 'move_attack' || effectType === 'attack_move';
    // move_attack: target then position; attack_move: target=self + position dopo

    row.innerHTML = `
      <div class="ab-head">
        <strong>${label}</strong>
        <span class="ab-cost">AP ${apCost}</span>
      </div>
      <div class="ab-effect"><code>${ab.effect_type || '—'}</code> · ${tgt || 'self'}${ab.cost_pi ? ` · PI ${ab.cost_pi}` : ''}</div>
      <div class="ab-desc">${desc}</div>
    `;
    row.addEventListener('click', () => {
      if (!canAfford) return;
      onAbility({
        ability_id: abilityId,
        needs_target: needsTarget,
        needs_position: needsPosition,
        target_kind: needsEnemyTarget ? 'enemy' : needsAllyTarget ? 'ally' : 'self',
        effect_type: effectType,
        move_distance: Number(ab.move_distance) || 0,
        raw: ab,
      });
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
