// TKT-M15-FE — Promotion UI accept/defer button (P3 Identità Specie x Job).
//
// Wires backend promotion engine (PR #2242) to the endgame overlay. On victory,
// fetch /api/session/:id/promotion-eligibility, render one card per eligible
// unit with accept/defer buttons. Defer is implicit (close debrief without
// accepting). Accept calls POST /api/session/:id/promote.
//
// Acceptance §3 closure from TKT-M15 scope ticket: frontend accept/defer button.

import { api } from './api.js';

function statKey(k) {
  const map = {
    hp: 'HP',
    attack_mod: 'Attacco',
    initiative: 'Iniziativa',
    ability_unlock_tier: 'Sblocca abilità tier',
  };
  return map[k] || k;
}

function renderDeltas(deltas) {
  if (!deltas || typeof deltas !== 'object') return '';
  const entries = Object.entries(deltas);
  if (entries.length === 0) return '<em class="promo-no-reward">Nessun bonus stat</em>';
  return entries
    .map(([k, v]) => {
      const sign = typeof v === 'number' && v > 0 ? '+' : '';
      return `<span class="promo-stat-chip">${statKey(k)} ${sign}${v}</span>`;
    })
    .join('');
}

function renderCard(unitId, eligibility) {
  const tierLabel = eligibility.next_tier || '—';
  const reward = eligibility.reward || {};
  const previewDeltas = {};
  if (reward.hp_bonus) previewDeltas.hp = reward.hp_bonus;
  if (reward.attack_mod_bonus) previewDeltas.attack_mod = reward.attack_mod_bonus;
  if (reward.initiative_bonus) previewDeltas.initiative = reward.initiative_bonus;
  if (reward.ability_unlock_tier) previewDeltas.ability_unlock_tier = reward.ability_unlock_tier;

  return `
    <div class="promo-card" data-unit="${unitId}" data-target-tier="${tierLabel}">
      <div class="promo-header">
        <strong class="promo-unit">${unitId}</strong>
        <span class="promo-tier-arrow">${eligibility.current_tier || '—'} → ${tierLabel}</span>
      </div>
      <div class="promo-rewards">${renderDeltas(previewDeltas)}</div>
      <div class="promo-actions">
        <button class="promo-accept" data-unit="${unitId}" data-target-tier="${tierLabel}">
          ✓ Accetta promozione
        </button>
        <button class="promo-defer" data-unit="${unitId}">⏭ Differisci</button>
      </div>
      <div class="promo-status" id="promo-status-${unitId}"></div>
    </div>
  `;
}

/**
 * Fetch promotion eligibility for the session and render cards for each
 * eligible unit. Attaches click handlers for accept/defer in-place.
 *
 * @param {string} sessionId
 * @param {HTMLElement} container — DOM element to append the panel into.
 *   Typically the endgame stats slot.
 */
export async function renderPromotionPanel(sessionId, container) {
  if (!sessionId || !container) return;
  const slot = document.createElement('div');
  slot.id = 'promotion-panel-slot';
  slot.className = 'promo-panel loading';
  slot.innerHTML = '<em>⏳ Promozioni…</em>';
  container.appendChild(slot);

  const r = await api.promotionEligibility(sessionId);
  if (!r.ok || !r.data) {
    slot.className = 'promo-panel error';
    slot.innerHTML = '<em>⚠ Promozioni non disponibili</em>';
    return;
  }
  const eligibleList = (r.data.eligibility || []).filter((e) => e && e.eligible);
  if (eligibleList.length === 0) {
    slot.className = 'promo-panel empty';
    slot.innerHTML = '<em>Nessuna promozione disponibile dopo questo combat.</em>';
    return;
  }
  slot.className = 'promo-panel';
  slot.innerHTML = `
    <h3>🎖 Promozioni disponibili</h3>
    <div class="promo-list">${eligibleList.map((e) => renderCard(e.unit_id, e)).join('')}</div>
  `;

  // Wire accept handlers.
  slot.querySelectorAll('.promo-accept').forEach((btn) => {
    btn.addEventListener('click', async (ev) => {
      const el = ev.currentTarget;
      const unitId = el.dataset.unit;
      const targetTier = el.dataset.targetTier;
      const statusEl = slot.querySelector(`#promo-status-${unitId}`);
      el.disabled = true;
      const deferBtn = slot.querySelector(`.promo-defer[data-unit="${unitId}"]`);
      if (deferBtn) deferBtn.disabled = true;
      if (statusEl) statusEl.innerHTML = '<em>⏳ Applico promozione…</em>';
      const resp = await api.promotionAccept(sessionId, unitId, targetTier);
      if (!resp.ok) {
        if (statusEl) {
          const reason = resp.data?.error || `HTTP ${resp.status}`;
          statusEl.className = 'promo-status error';
          statusEl.textContent = `✖ ${reason}`;
        }
        el.disabled = false;
        if (deferBtn) deferBtn.disabled = false;
        return;
      }
      const card = el.closest('.promo-card');
      if (card) card.classList.add('promo-accepted');
      if (statusEl) {
        statusEl.className = 'promo-status ok';
        statusEl.innerHTML = `✓ Promosso a <strong>${resp.data?.applied_tier || targetTier}</strong>`;
      }
    });
  });

  // Defer: visual-only collapse, no API call (eligibility persists in session).
  slot.querySelectorAll('.promo-defer').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      const card = ev.currentTarget.closest('.promo-card');
      if (card) card.classList.add('promo-deferred');
      const statusEl = slot.querySelector(`#promo-status-${ev.currentTarget.dataset.unit}`);
      if (statusEl) {
        statusEl.className = 'promo-status deferred';
        statusEl.textContent = '⏭ Differita (riproponibile prossimo debrief)';
      }
    });
  });
}
