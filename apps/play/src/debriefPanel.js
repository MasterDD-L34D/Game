// M19 — Debrief overlay (phone).
// Post-combat summary: outcome + XP + narrative + ready button.
// ADR coop-mvp-spec.md §2.6.

// OD-013 Path B integration: dialogue color codes (gated by Path A reveal).
// `renderMbtiTaggedHtml` wraps `<mbti axis="X">...</mbti>` segments con `<span
// class="mbti-axis-X">` SOLO se l'asse è rivelato in `mbtiRevealed.revealed[]`.
// Plain text passa-through invariato (escape HTML safety lo gestisce il helper).
import { renderMbtiTaggedHtml } from './dialogueRender.js';
// OD-001 Path A Sprint B: recruit POST goes through api client (network retry +
// graceful failure handling). Lazy import only if api ever becomes circular.
import { api } from './api.js';
// Sprint 10 (Surface-DEAD #7): QBN narrative event diegetic render in debrief.
import { renderNarrativeEvent } from './qbnDebriefRender.js';
// Sprint 12 (Surface-DEAD #4): Mating lifecycle eligibles render in debrief.
import { renderLineageEligibles } from './lineagePanel.js';
// 2026-05-10 sera Sprint Q+ Q-9: Offspring ritual panel post-mating choice.
import { setupOffspringRitual } from './offspringRitualPanel.js';
// 2026-05-06 TKT-P4-ENNEA-VOICE-FRONTEND: 9/9 ennea voice palette wire.
// Engine LIVE Surface DEAD #1 P4 fix — ~189 line authorate visibili in debrief.
import { renderEnneaVoices } from './enneaVoiceRender.js';

// Sprint Surface-DEAD ennea archetypes — 9 archetypes player surface in debrief.
// Mirror ENNEA_META da characterPanel.js (kept self-contained per debrief scope).
const ENNEA_META = {
  'Riformatore(1)': { icon: '⚖️', label: 'Riformatore', desc: 'Setup metodico, alta precisione.' },
  'Coordinatore(2)': { icon: '🤝', label: 'Coordinatore', desc: 'Coesione di squadra.' },
  'Conquistatore(3)': { icon: '🔥', label: 'Conquistatore', desc: 'Aggressione e rischio.' },
  'Individualista(4)': {
    icon: '🌙',
    label: 'Individualista',
    desc: 'Resilienza in zona critica.',
  },
  'Architetto(5)': {
    icon: '🏛️',
    label: 'Architetto',
    desc: 'Strategia metodica, basso rischio.',
  },
  'Lealista(6)': { icon: '🛡️', label: 'Lealista', desc: 'Vigilanza e supporto attivo.' },
  'Esploratore(7)': { icon: '🧭', label: 'Esploratore', desc: 'Scoperta e mobilità.' },
  'Cacciatore(8)': { icon: '🏹', label: 'Cacciatore', desc: 'Mordi-e-fuggi mirato.' },
  'Stoico(9)': { icon: '🗿', label: 'Stoico', desc: 'Endurance sotto pressione.' },
};

function escapeEnneaHtml(s) {
  return String(s || '').replace(
    /[<>&"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c],
  );
}

// OD-001 Path A V3 Mating/Nido (2026-04-26): pure helper DOM-free per identify
// recruitable enemies post-combat. Filtra unit team !== player/ally con hp<=0.
// Preserva name/hp_max/mbti_type per UI label downstream.
export function findRecruitableEnemies(world) {
  if (!world || typeof world !== 'object') return [];
  const units = Array.isArray(world.units) ? world.units : null;
  if (!units) return [];
  return units.filter((u) => {
    if (!u || typeof u !== 'object') return false;
    const team = u.team || u.faction || u.owner_team || 'enemy';
    if (team === 'player' || team === 'ally') return false;
    const hp = Number(u.hp);
    if (!Number.isFinite(hp) || hp > 0) return false;
    return true;
  });
}

// OD-001 Path A Sprint B (2026-04-26): debrief recruit wire — affinity scoring.
// Wildermyth/Hades pattern: defeated enemy → recruitable when affinity exceeds
// threshold. Scoring rules (additive):
//   +2 same MBTI type (best resonance)
//   +1 MBTI compat: enemy in player.compat_forme[player.mbti].likes
//   -1 MBTI compat: enemy in player.compat_forme[player.mbti].dislikes
//   +1 enemy is non-boss (regular kill — easier rapport)
//   +1 enemy is boss defeated (Wildermyth iconic foe — narrative resonance)
// Default fallback (no MBTI on either side): regular=1 / boss=2 baseline.
// Threshold 1 = recruitable. Returns {affinity:Number, reasons:string[]}.
export function computeRecruitAffinity(enemyUnit, playerMember, compatTable = {}) {
  const reasons = [];
  let affinity = 0;
  if (!enemyUnit || typeof enemyUnit !== 'object') {
    return { affinity: 0, reasons: ['enemy invalido'] };
  }
  const enemyMbti = enemyUnit.mbti_type || enemyUnit.mbti || null;
  const playerMbti = playerMember?.mbti_type || playerMember?.mbti || null;
  const isBoss = Boolean(
    enemyUnit.is_boss || enemyUnit.boss || (enemyUnit.tags && enemyUnit.tags.includes?.('boss')),
  );
  if (isBoss) {
    affinity += 1;
    reasons.push('+1 boss defeated');
  } else {
    affinity += 1;
    reasons.push('+1 regular defeat');
  }
  if (enemyMbti && playerMbti) {
    if (enemyMbti === playerMbti) {
      affinity += 2;
      reasons.push(`+2 MBTI risonanza (${playerMbti})`);
    } else {
      const compat =
        compatTable && typeof compatTable === 'object' ? compatTable[playerMbti] : null;
      if (compat) {
        if (Array.isArray(compat.likes) && compat.likes.includes(enemyMbti)) {
          affinity += 1;
          reasons.push(`+1 MBTI like ${playerMbti}→${enemyMbti}`);
        } else if (Array.isArray(compat.dislikes) && compat.dislikes.includes(enemyMbti)) {
          affinity -= 1;
          reasons.push(`-1 MBTI dislike ${playerMbti}→${enemyMbti}`);
        }
      }
    }
  }
  return { affinity, reasons };
}

// Affinity threshold for showing recruit button (UI gate). Backend bypass
// threshold is in routes/meta.js. Match them: any positive affinity → eligible.
export const RECRUIT_AFFINITY_UI_THRESHOLD = 1;

export function renderDebriefPanel() {
  if (typeof document === 'undefined') return null;
  let overlay = document.getElementById('debrief-overlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'debrief-overlay';
  overlay.className = 'debrief-overlay';
  overlay.innerHTML = `
    <div class="db-wrap">
      <div class="db-outcome" id="db-outcome" data-kind="victory">
        <span class="db-outcome-icon">🏁</span>
        <span class="db-outcome-label">Round concluso</span>
      </div>

      <div class="db-card">
        <div class="db-card-title">IL TUO PG</div>
        <div class="db-card-row">
          <span class="db-card-name" id="db-pg-name">—</span>
          <span class="db-card-level" id="db-pg-level">Lv 1</span>
        </div>
        <div class="db-card-stats">
          <div class="db-stat"><span>XP</span><span id="db-xp">0</span></div>
          <div class="db-stat"><span>HP</span><span id="db-hp">—/—</span></div>
          <div class="db-stat"><span>Survived</span><span id="db-survived">✓</span></div>
        </div>
      </div>

      <div class="db-section" id="db-evolve-section" style="display:none">
        <div class="db-section-title">Evoluzione Form disponibile</div>
        <div class="db-evolve-card">
          <div class="db-evolve-title" id="db-evolve-title">—</div>
          <div class="db-evolve-blurb" id="db-evolve-blurb">—</div>
          <div class="db-evolve-row">
            <button type="button" class="db-evolve-btn" id="db-evolve-yes">🧬 Evolve</button>
            <button type="button" class="db-skip-btn" id="db-evolve-no">⏭ Mantieni</button>
          </div>
        </div>
      </div>

      <div class="db-section" id="db-recruit-section" style="display:none">
        <div class="db-section-title">🤝 Reclutabili dal Nido</div>
        <div class="db-recruit-list" id="db-recruit-list">
          <div class="db-empty">Nessun nemico reclutabile</div>
        </div>
        <div class="db-recruit-hint" id="db-recruit-hint"></div>
      </div>

      <div class="db-section" id="db-rewards-section" style="display:none">
        <div class="db-section-title">🎁 Ricompense Tri-Sorgente</div>
        <div class="db-rewards-list" id="db-rewards-list">
          <div class="db-empty">Caricamento offerte…</div>
        </div>
        <button type="button" class="db-skip-btn" id="db-rewards-skip">⏭ Skip (+1 Frammento Genetico)</button>
      </div>

      <div class="db-section" id="db-mbti-section" style="display:none">
        <div class="db-section-title">🧬 Personalità — assi rivelati</div>
        <div class="db-mbti-grid" id="db-mbti-grid"></div>
        <div class="db-mbti-hidden" id="db-mbti-hidden"></div>
      </div>

      <!-- Sprint R+1 (Surface-DEAD #X ennea archetypes): 9 archetypes player surface. -->
      <div class="db-section" id="db-ennea-section" style="display:none">
        <div class="db-section-title">🌀 Archetipi Ennea — manifestati</div>
        <div class="db-ennea-grid" id="db-ennea-grid"></div>
      </div>

      <!-- 2026-05-06 TKT-P4-ENNEA-VOICE-FRONTEND: 9/9 voice palette diegetic per actor. -->
      <div class="db-section" id="db-ennea-voices-section" style="display:none">
        <div class="db-section-title">🗣️ Voci dell'archetipo</div>
        <div class="db-ennea-voices-list" id="db-ennea-voices-list"></div>
      </div>

      <!-- Sprint 10 (Surface-DEAD #7): QBN narrative event diegetic. -->
      <div class="db-section db-qbn-section" id="db-qbn-section" style="display:none">
        <div class="db-section-title">📖 Cronaca diegetica</div>
        <div class="db-qbn-card" id="db-qbn-card"></div>
      </div>

      <!-- Sprint 12 (Surface-DEAD #4): Mating lifecycle eligibles. -->
      <div class="db-section db-lineage-section" id="db-lineage-section" style="display:none">
        <div class="db-section-title">🏠 Lineage Eligibili</div>
        <div class="db-lineage-list" id="db-lineage-list"></div>
      </div>

      <!-- 2026-05-10 sera Sprint Q+ Q-9: Offspring ritual panel (mutation choice 3-of-6). -->
      <div class="db-section db-offspring-ritual-section" id="db-offspring-ritual-section" style="display:none"></div>

      <div class="db-section">
        <div class="db-section-title">Cronaca del round</div>
        <div class="db-narrative" id="db-narrative">
          <div class="db-empty">Nessun evento registrato</div>
        </div>
      </div>

      <button type="button" class="db-ready" id="db-ready">
        ✅ Pronto — prossimo scenario
      </button>
      <div class="db-status" id="db-status" aria-live="polite"></div>

      <div class="db-section" id="db-skiv-section">
        <div class="db-section-title">🦎 Skiv — riflessione</div>
        <pre class="db-skiv-card" id="db-skiv-card">[ Skiv tace. Sabbia ferma. ]</pre>
      </div>

      <div class="db-section">
        <div class="db-section-title">Party (<span id="db-party-count">0</span>)</div>
        <div class="db-party" id="db-party"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

/** Compone testo narrativo italiano da events combat. */
function narrativeFromEvents(events) {
  if (!Array.isArray(events) || events.length === 0) return [];
  const out = [];
  for (const e of events.slice(-20)) {
    const actor = e.actor || e.actor_id || '?';
    const target = e.target || e.target_id || '?';
    const kind = e.kind || e.type || e.action || 'event';
    switch (kind) {
      case 'attack':
      case 'attack_hit': {
        const dmg = e.damage ?? e.dmg ?? '?';
        const crit = e.critical ? ' (crit!)' : '';
        out.push(`${actor} colpisce ${target} per ${dmg}${crit}.`);
        break;
      }
      case 'attack_miss':
        out.push(`${actor} manca ${target}.`);
        break;
      case 'move':
        out.push(`${actor} si muove.`);
        break;
      case 'defend':
        out.push(`${actor} si difende.`);
        break;
      case 'unit_dead':
      case 'death':
        out.push(`💀 ${actor} è stato eliminato.`);
        break;
      case 'heal':
        out.push(`${actor} recupera HP.`);
        break;
      default:
        out.push(`${actor} ${kind}${target !== '?' ? ` → ${target}` : ''}.`);
    }
  }
  return out;
}

export function wireDebriefPanel(overlay, bridge) {
  if (!overlay || !bridge) return null;
  const state = {
    submitted: false,
    lastState: null,
    outcome: 'victory',
    partyList: [],
    readySet: new Set(),
    mbtiRevealed: null,
    // Sprint Surface-DEAD ennea: archetype list per current player.
    // Shape accepted: ["Conquistatore(3)", ...] (string) OR [{id, triggered}, ...] (object).
    enneaArchetypes: [],
    // Sprint 10 (Surface-DEAD #7): QBN narrative event payload from debrief.
    // Shape: {id, title_it, body_it, choices: [{id, label_it}], eligible_count}
    narrativeEvent: null,
    // Sprint 12 (Surface-DEAD #4): Mating lifecycle eligibles from debrief.
    // Shape: [{parent_a_id, parent_b_id, parent_a_name, parent_b_name, biome_id,
    // can_mate, expected_offspring_count}]. Empty array hides section.
    matingEligibles: [],
    // 2026-05-06 TKT-P4-ENNEA-VOICE-FRONTEND: ennea voice palette per actor.
    // Shape: [{actor_id, archetype_id, ennea_type, beat_id, line_id, text}].
    // Empty array hides section.
    enneaVoices: [],
    // OD-001 Path A Sprint B (2026-04-26): debrief recruit wire.
    recruitedNpcIds: new Set(),
    recruitInFlight: new Set(),
    compatTable: null,
  };

  const outcomeEl = overlay.querySelector('#db-outcome');
  const outcomeLabel = overlay.querySelector('.db-outcome-label');
  const outcomeIcon = overlay.querySelector('.db-outcome-icon');
  const readyBtn = overlay.querySelector('#db-ready');
  const statusEl = overlay.querySelector('#db-status');

  const setStatus = (msg, kind) => {
    statusEl.textContent = msg || '';
    statusEl.dataset.kind = kind || '';
  };

  const renderOutcome = () => {
    const isWin = state.outcome !== 'defeat' && state.outcome !== 'timeout';
    outcomeEl.dataset.kind = isWin ? 'victory' : 'defeat';
    outcomeIcon.textContent = isWin ? '🏆' : state.outcome === 'timeout' ? '⏱' : '💀';
    outcomeLabel.textContent = isWin
      ? 'Vittoria!'
      : state.outcome === 'timeout'
        ? 'Tempo scaduto'
        : 'Sconfitta';
  };

  const renderPgCard = () => {
    const myUnit = findMyUnit(state.lastState, bridge.session.player_id);
    if (!myUnit) {
      overlay.querySelector('#db-pg-name').textContent = '—';
      overlay.querySelector('#db-pg-level').textContent = 'Lv ?';
      overlay.querySelector('#db-xp').textContent = '—';
      overlay.querySelector('#db-hp').textContent = '—/—';
      overlay.querySelector('#db-survived').textContent = '—';
      return;
    }
    overlay.querySelector('#db-pg-name').textContent = myUnit.name || myUnit.id;
    overlay.querySelector('#db-pg-level').textContent = `Lv ${myUnit.level ?? 1}`;
    overlay.querySelector('#db-xp').textContent = String(myUnit.xp ?? 0);
    const hp = myUnit.hp ?? 0;
    const hpMax = myUnit.hp_max ?? myUnit.max_hp ?? hp;
    overlay.querySelector('#db-hp').textContent = `${hp}/${hpMax}`;
    overlay.querySelector('#db-survived').textContent = hp > 0 ? '✓' : '✗';
  };

  const renderNarrative = () => {
    const list = overlay.querySelector('#db-narrative');
    const events = state.lastState?.events || [];
    const lines = narrativeFromEvents(events);
    if (lines.length === 0) {
      list.innerHTML = '<div class="db-empty">Nessun evento registrato</div>';
      return;
    }
    // OD-013 Path B: render con MBTI color spans gated da state.mbtiRevealed.
    // Combat events da `narrativeFromEvents` non hanno tag MBTI → passa-through
    // come plain text (helper escapa HTML safety). Quando narrativeEngine
    // emetterà linee con `<mbti axis="X">`, qui si colorano se asse rivelato.
    list.innerHTML = lines
      .map(
        (l) => `<div class="db-narrative-row">${renderMbtiTaggedHtml(l, state.mbtiRevealed)}</div>`,
      )
      .join('');
    list.scrollTop = list.scrollHeight;
  };

  // Skiv-as-Monitor — mini card render in debrief (Phase 2 wire 2026-04-25).
  // Fetch text/plain ASCII card from backend; graceful fallback if offline.
  const renderSkivMonitorCard = async () => {
    const cardEl = overlay.querySelector('#db-skiv-card');
    if (!cardEl) return;
    try {
      const res = await fetch('/api/skiv/card', { cache: 'no-store' });
      if (!res.ok) {
        cardEl.textContent = '[ Skiv dorme. Monitor non ha girato. ]';
        return;
      }
      const text = await res.text();
      cardEl.textContent = text || '[ Skiv tace. ]';
    } catch {
      cardEl.textContent = '[ Backend irraggiungibile. Sabbia tace. ]';
    }
  };

  // OD-013 Path A — MBTI phased reveal (Disco Elysium pacing).
  // state.mbtiRevealed = { revealed: [...], hidden: [...] } per current player.
  const renderMbti = () => {
    const section = overlay.querySelector('#db-mbti-section');
    const grid = overlay.querySelector('#db-mbti-grid');
    const hiddenEl = overlay.querySelector('#db-mbti-hidden');
    if (!section || !grid || !hiddenEl) return;
    const data = state.mbtiRevealed;
    if (!data || (!data.revealed?.length && !data.hidden?.length)) {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';
    const revealed = Array.isArray(data.revealed) ? data.revealed : [];
    const hidden = Array.isArray(data.hidden) ? data.hidden : [];
    if (revealed.length === 0) {
      grid.innerHTML = '<div class="db-empty">Nessun asse ancora rivelato</div>';
    } else {
      grid.innerHTML = revealed
        .map((r) => {
          const pct = Math.round(Math.max(0, Math.min(1, Number(r.confidence) || 0)) * 100);
          const safeLabel = String(r.label || '').replace(/[<>&"]/g, '');
          const safeAxis = String(r.axis_label || '').replace(/[<>&"]/g, '');
          const safeLetter = String(r.letter || '?').replace(/[<>&"]/g, '');
          return `<div class="db-mbti-card" data-axis="${r.axis}">
            <div class="db-mbti-letter">${safeLetter}</div>
            <div class="db-mbti-meta">
              <div class="db-mbti-axis">${safeAxis}</div>
              <div class="db-mbti-label">${safeLabel}</div>
              <div class="db-mbti-bar"><div class="db-mbti-bar-fill" style="width:${pct}%"></div></div>
              <div class="db-mbti-conf">${pct}%</div>
            </div>
          </div>`;
        })
        .join('');
    }
    if (hidden.length === 0) {
      hiddenEl.innerHTML = '';
    } else {
      hiddenEl.innerHTML = hidden
        .map((h) => {
          const safeAxis = String(h.axis_label || '').replace(/[<>&"]/g, '');
          const safeHint = String(h.hint || '').replace(/[<>&"]/g, '');
          return `<div class="db-mbti-hidden-row"><span class="db-mbti-q">?</span><span class="db-mbti-axis-name">${safeAxis}</span><span class="db-mbti-hint">${safeHint}</span></div>`;
        })
        .join('');
    }
  };

  // Sprint Surface-DEAD ennea — render 9 archetypes manifested per current player.
  // Sezione hidden quando enneaArchetypes vuoto. Accetta shape misto:
  // - "Conquistatore(3)" (string) → triggered=true implicit
  // - {id: "Conquistatore(3)", triggered: bool} (object)
  const renderEnnea = () => {
    const section = overlay.querySelector('#db-ennea-section');
    const grid = overlay.querySelector('#db-ennea-grid');
    if (!section || !grid) return;
    const archetypes = Array.isArray(state.enneaArchetypes) ? state.enneaArchetypes : [];
    if (archetypes.length === 0) {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';
    grid.innerHTML = archetypes
      .map((a) => {
        const id = typeof a === 'string' ? a : a?.id;
        const triggered = typeof a === 'string' ? true : !!a?.triggered;
        if (!id) return '';
        const meta = ENNEA_META[id] || { icon: '◯', label: id, desc: '' };
        const cls = triggered ? 'db-ennea-badge triggered' : 'db-ennea-badge';
        return `
          <div class="${cls}" data-archetype="${escapeEnneaHtml(id)}">
            <span class="db-ennea-icon">${meta.icon}</span>
            <span class="db-ennea-label">${escapeEnneaHtml(meta.label)}</span>
            <div class="db-ennea-desc">${escapeEnneaHtml(meta.desc)}</div>
          </div>
        `;
      })
      .join('');
  };

  // Sprint 10 (Surface-DEAD #7) — render QBN narrative event diegetic.
  // Sezione hidden by default, rivela quando narrativeEvent payload presente.
  // Idempotent: setNarrativeEvent(null) → hide.
  const renderQbn = () => {
    const section = overlay.querySelector('#db-qbn-section');
    const card = overlay.querySelector('#db-qbn-card');
    renderNarrativeEvent(section, card, state.narrativeEvent);
  };

  // 2026-05-06 TKT-P4-ENNEA-VOICE-FRONTEND — render 9/9 ennea voice quotes.
  // Sezione hidden by default, rivela quando enneaVoices payload non vuoto.
  // Idempotent: setEnneaVoices([]) → hide.
  const renderEnneaVoicesSection = () => {
    const section = overlay.querySelector('#db-ennea-voices-section');
    const list = overlay.querySelector('#db-ennea-voices-list');
    if (!section || !list) return;
    renderEnneaVoices(section, list, state.enneaVoices);
  };

  // Sprint 12 (Surface-DEAD #4) — render lineage eligibles (pair-bond cards).
  // Sezione hidden by default, rivela quando matingEligibles non vuota.
  // Solo su victory (defeat = niente lineage); il backend già filtra ma
  // doppio-gate qui per safety se setter chiamato fuori contesto.
  const renderLineage = () => {
    const section = overlay.querySelector('#db-lineage-section');
    const list = overlay.querySelector('#db-lineage-list');
    if (!section || !list) return;
    const isWin = state.outcome !== 'defeat' && state.outcome !== 'timeout';
    const eligibles = isWin && Array.isArray(state.matingEligibles) ? state.matingEligibles : [];
    renderLineageEligibles(section, list, eligibles);
  };

  // OD-001 Path A Sprint B (2026-04-26): debrief recruit section render.
  // Wildermyth/Hades — defeated enemies con affinity≥threshold get a recruit
  // button. Player MBTI scored against enemy MBTI via state.compatTable
  // (loaded async on first render via `loadCompatTable`).
  const renderRecruit = () => {
    const section = overlay.querySelector('#db-recruit-section');
    const list = overlay.querySelector('#db-recruit-list');
    const hint = overlay.querySelector('#db-recruit-hint');
    if (!section || !list) return;
    // Solo su victory (defeat = niente recluta sopra cadaveri tuoi).
    if (state.outcome !== 'victory') {
      section.style.display = 'none';
      return;
    }
    const enemies = findRecruitableEnemies(state.lastState);
    if (!enemies.length) {
      section.style.display = 'none';
      return;
    }
    const playerMember = readPlayerMember();
    const compat = state.compatTable || {};
    // Score + filter affinity >= threshold OR fallback always-show con score.
    const candidates = enemies.map((u) => {
      const { affinity, reasons } = computeRecruitAffinity(u, playerMember, compat);
      return { unit: u, affinity, reasons };
    });
    const eligible = candidates.filter((c) => c.affinity >= RECRUIT_AFFINITY_UI_THRESHOLD);
    if (!eligible.length) {
      section.style.display = '';
      list.innerHTML =
        '<div class="db-empty">Nessun nemico con affinità sufficiente per il reclutamento.</div>';
      if (hint) hint.textContent = '';
      return;
    }
    section.style.display = '';
    list.innerHTML = '';
    for (const c of eligible) {
      const u = c.unit;
      const npcId = String(u.id || u.npc_id || u.unit_id || '');
      if (!npcId) continue;
      const recruited = state.recruitedNpcIds.has(npcId);
      const inFlight = state.recruitInFlight.has(npcId);
      const card = document.createElement('div');
      card.className = `db-recruit-card${recruited ? ' recruited' : ''}`;
      card.dataset.npcId = npcId;
      const safeName = String(u.name || npcId).replace(/[<>&"]/g, '');
      const safeSpecies = String(u.species || u.species_id || u.archetype || '').replace(
        /[<>&"]/g,
        '',
      );
      const mbtiLabel = u.mbti_type ? String(u.mbti_type).replace(/[<>&"]/g, '') : '—';
      const hpMax = u.hp_max ?? u.max_hp ?? '?';
      const atk = u.atk ?? u.attack ?? u.attack_mod ?? '?';
      card.innerHTML = `
        <div class="db-recruit-avatar" aria-hidden="true">${recruited ? '⚡' : '🪺'}</div>
        <div class="db-recruit-meta">
          <div class="db-recruit-name">${safeName}</div>
          <div class="db-recruit-sub">
            ${safeSpecies ? `<span class="db-recruit-tag">${safeSpecies}</span>` : ''}
            <span class="db-recruit-tag mbti">MBTI ${mbtiLabel}</span>
            <span class="db-recruit-tag">HP ${hpMax}</span>
            <span class="db-recruit-tag">ATK ${atk}</span>
          </div>
          <div class="db-recruit-aff" title="${c.reasons.join(' · ')}">
            Affinità: <strong>${c.affinity}</strong>
          </div>
        </div>
        <button type="button" class="db-recruit-btn" data-npc-id="${npcId}"
          ${recruited || inFlight ? 'disabled' : ''}>
          ${recruited ? '✓ Alleato' : inFlight ? '…' : '🤝 Recluta'}
        </button>
      `;
      const btn = card.querySelector('.db-recruit-btn');
      if (btn) {
        btn.addEventListener('click', () => handleRecruitClick(npcId, c.affinity));
      }
      list.appendChild(card);
    }
    if (hint) {
      hint.textContent = `${eligible.length} reclutabile${eligible.length === 1 ? '' : 'i'}`;
    }
  };

  // Toast/feedback in main status line. Reuse setStatus channel.
  const recruitToast = (msg, kind) => setStatus(msg, kind);

  function readPlayerMember() {
    // Provider chain: bridge.getPartyMember() (preferred) → my unit → null.
    let pm = null;
    try {
      pm = bridge.getPartyMember?.() || null;
    } catch {
      /* optional */
    }
    if (pm) return pm;
    const myUnit = findMyUnit(state.lastState, bridge.session?.player_id);
    if (myUnit) {
      return {
        mbti_type: myUnit.mbti_type || myUnit.mbti || null,
        trait_ids: myUnit.trait_ids || myUnit.traits || [],
      };
    }
    return null;
  }

  async function handleRecruitClick(npcId, affinity) {
    if (state.recruitedNpcIds.has(npcId) || state.recruitInFlight.has(npcId)) return;
    state.recruitInFlight.add(npcId);
    renderRecruit();
    recruitToast(`Reclutamento di ${npcId}…`);
    try {
      const sessionId = bridge.session?.session_id || bridge.session?.code || null;
      const res = await api.metaRecruit(npcId, sessionId, affinity);
      if (!res.ok) {
        recruitToast(`✖ Errore rete: HTTP ${res.status}`, 'err');
        state.recruitInFlight.delete(npcId);
        renderRecruit();
        return;
      }
      const data = res.data || {};
      if (data.success) {
        state.recruitedNpcIds.add(npcId);
        state.recruitInFlight.delete(npcId);
        recruitToast(`🤝 ${npcId} si unisce al Nido!`, 'ok');
      } else {
        const reason = data.reason || 'unknown';
        recruitToast(`✖ Reclutamento fallito: ${reason}`, 'err');
        state.recruitInFlight.delete(npcId);
      }
    } catch (err) {
      recruitToast(`✖ Errore: ${err?.message || String(err)}`, 'err');
      state.recruitInFlight.delete(npcId);
    }
    renderRecruit();
  }

  const renderParty = () => {
    const list = overlay.querySelector('#db-party');
    const count = overlay.querySelector('#db-party-count');
    const entries = state.partyList || [];
    if (count) count.textContent = String(entries.length);
    if (!entries.length) {
      list.innerHTML = '<div class="db-empty">Solo tu per ora</div>';
      return;
    }
    list.innerHTML = entries
      .map((p) => {
        const ready = state.readySet.has(p.id);
        return `<div class="db-party-row ${ready ? 'ready' : 'pending'}">
          <span class="db-party-dot"></span>
          <span class="db-party-name">${p.name || p.id}</span>
          <span class="db-party-status">${ready ? '✅ pronto' : '💭'}</span>
        </div>`;
      })
      .join('');
  };

  const render = () => {
    renderOutcome();
    renderPgCard();
    renderNarrative();
    renderParty();
    renderMbti();
    renderQbn();
    renderLineage();
    renderEnneaVoicesSection();
    renderRecruit();
    // Fire-and-forget: Skiv card refresh ad ogni render debrief.
    renderSkivMonitorCard();
    // Fire-and-forget: lazy-load MBTI compat table on first render.
    if (state.compatTable === null) {
      state.compatTable = {}; // mark as loading
      loadCompatTable().then((tbl) => {
        state.compatTable = tbl || {};
        renderRecruit();
      });
    }
  };

  // OD-001 Path A Sprint B (2026-04-26): lazy-load MBTI compat table from
  // backend if exposed via /api/meta/compat. Graceful fallback {} on miss.
  async function loadCompatTable() {
    try {
      const res = await fetch('/api/meta/compat', { cache: 'force-cache' });
      if (!res.ok) return {};
      const data = await res.json();
      return data?.compat_forme || data || {};
    } catch {
      return {};
    }
  }

  readyBtn.addEventListener('click', async () => {
    if (state.submitted) return;
    setStatus('Invio…');
    readyBtn.disabled = true;
    try {
      const res = await fetch('/api/coop/debrief/choice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: bridge.session.code,
          player_id: bridge.session.player_id,
          player_token: bridge.session.token,
          choice: { type: 'skip' },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(`Errore: ${data?.error || 'HTTP ' + res.status}`, 'err');
        readyBtn.disabled = false;
        return;
      }
      state.submitted = true;
      state.readySet.add(bridge.session.player_id);
      renderParty();
      setStatus('✓ Pronto — attendi altri', 'ok');
    } catch (err) {
      setStatus(`Errore rete: ${err.message}`, 'err');
      readyBtn.disabled = false;
    }
  });

  // V2 Tri-Sorgente — reward offer section
  const rewardsSection = overlay.querySelector('#db-rewards-section');
  const rewardsList = overlay.querySelector('#db-rewards-list');
  const rewardsSkipBtn = overlay.querySelector('#db-rewards-skip');

  async function fetchAndRenderRewards(campaignId, actorId) {
    if (!rewardsSection || !campaignId) return;
    rewardsSection.style.display = '';
    rewardsList.innerHTML = '<div class="db-empty">Caricamento…</div>';
    try {
      const res = await fetch('/api/rewards/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, actor_id: actorId || null }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.offers)) {
        rewardsList.innerHTML = '<div class="db-empty">Offerte non disponibili</div>';
        return;
      }
      rewardsList.innerHTML = '';
      for (const o of data.offers) {
        const card = document.createElement('div');
        // Sprint 4 §III (2026-04-27) — Isaac Anomaly glow effect.
        // Source: docs/research/2026-04-26-tier-b-extraction-matrix.md #7 Isaac.
        // Pattern: cards tagged `anomaly` get pulsing glow + gold border (transformative).
        const tags = Array.isArray(o.card?.synergy_tags) ? o.card.synergy_tags : [];
        const isAnomaly =
          tags.includes('anomaly') || (o.card?.rarity || '').toLowerCase() === 'legendary';
        card.className = 'db-evolve-card' + (isAnomaly ? ' db-anomaly-glow' : '');
        const anomalyBadge = isAnomaly ? '<span class="db-anomaly-badge">⚡ ANOMALIA</span>' : '';
        card.innerHTML = `
          ${anomalyBadge}
          <div class="db-evolve-title">${o.card?.label || o.card?.id || '—'}</div>
          <div class="db-evolve-blurb">${o.card?.rarity || 'common'} · score ${Number(o.score || 0).toFixed(2)}</div>
        `;
        rewardsList.appendChild(card);
      }
    } catch (err) {
      rewardsList.innerHTML = `<div class="db-empty">Errore: ${err.message}</div>`;
    }
  }

  if (rewardsSkipBtn) {
    rewardsSkipBtn.addEventListener('click', async () => {
      const cid = state.campaignId;
      if (!cid) return;
      try {
        await fetch('/api/rewards/skip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaign_id: cid, reason: 'skip_offer' }),
        });
        setStatus('✓ Skip: +1 Frammento Genetico', 'ok');
        rewardsSection.style.display = 'none';
      } catch (err) {
        setStatus(`Errore skip: ${err.message}`, 'err');
      }
    });
  }

  return {
    setState(worldState, outcome) {
      state.lastState = worldState;
      if (outcome) state.outcome = outcome;
      render();
    },
    // V2 Tri-Sorgente — called post-victory when campaign_id available
    showRewardOffer(campaignId, actorId) {
      state.campaignId = campaignId;
      if (state.outcome === 'victory') fetchAndRenderRewards(campaignId, actorId);
    },
    setReadyList(list) {
      state.readySet.clear();
      for (const id of list || []) state.readySet.add(id);
      renderParty();
    },
    setParty(players) {
      state.partyList = players
        .filter((p) => p.role !== 'host')
        .map((p) => ({ id: p.id, name: p.name || p.id }));
      renderParty();
    },
    // OD-013 Path A — set MBTI phased reveal payload for current player.
    // Accepts either {revealed, hidden} or null. Graceful: no section if null.
    setMbtiRevealed(payload) {
      state.mbtiRevealed =
        payload && typeof payload === 'object' && (payload.revealed || payload.hidden)
          ? payload
          : null;
      renderMbti();
    },
    // Sprint 10 (Surface-DEAD #7) — set QBN narrative event from debrief.
    // Accepts {id, title_it, body_it, choices, eligible_count} or null.
    // Graceful: section nascosta quando payload mancante / id+title+body vuoti.
    setNarrativeEvent(payload) {
      state.narrativeEvent =
        payload &&
        typeof payload === 'object' &&
        (payload.id || payload.title_it || payload.body_it)
          ? payload
          : null;
      renderQbn();
    },
    // Sprint 12 (Surface-DEAD #4) — set lineage eligibles from debrief.
    // Accepts mating_eligibles array or null. Graceful: section nascosta
    // quando array vuoto / null / outcome non-victory.
    setLineageEligibles(payload) {
      state.matingEligibles = Array.isArray(payload) ? payload : [];
      renderLineage();
    },
    // 2026-05-10 sera Sprint Q+ Q-9 — set offspring ritual pair post-mating.
    // Accepts { sessionId, parent_a_id, parent_b_id } OR null. Async: fetch
    // mutations canonical 6-of-6 + render selection grid (3-of-6 max).
    // POST /api/v1/lineage/offspring-ritual on confirm.
    async setOffspringRitualPair(pair) {
      const section = overlay.querySelector('#db-offspring-ritual-section');
      if (!section) return;
      if (state.offspringRitualDispose) {
        try {
          state.offspringRitualDispose();
        } catch (_e) {
          // best-effort
        }
        state.offspringRitualDispose = null;
      }
      if (!pair || !pair.sessionId || !pair.parent_a_id || !pair.parent_b_id) {
        section.style.display = 'none';
        return;
      }
      const handle = await setupOffspringRitual(section, pair, {
        onSuccess: (offspring) => {
          if (typeof opts.onOffspringRitualSuccess === 'function') {
            opts.onOffspringRitualSuccess(offspring);
          }
        },
        onError: (err) => {
          if (typeof opts.onOffspringRitualError === 'function') {
            opts.onOffspringRitualError(err);
          }
        },
      });
      state.offspringRitualDispose = handle?.dispose || null;
    },
    // Sprint Surface-DEAD ennea — set archetypes manifested for current player.
    // Accepts ["Conquistatore(3)", ...] OR [{id, triggered}, ...] OR null.
    // Graceful: section nascosta quando vuoto/null.
    setEnneaArchetypes(payload) {
      state.enneaArchetypes = Array.isArray(payload) ? payload : [];
      renderEnnea();
    },
    // 2026-05-06 TKT-P4-ENNEA-VOICE-FRONTEND — set ennea voice palette per actor.
    // Accepts [{actor_id, archetype_id, ennea_type, beat_id, line_id, text}].
    // Empty / null → hide section.
    setEnneaVoices(payload) {
      state.enneaVoices = Array.isArray(payload) ? payload : [];
      renderEnneaVoicesSection();
    },
    show() {
      overlay.classList.remove('db-hidden');
    },
    hide() {
      overlay.classList.add('db-hidden');
    },
    reset() {
      state.submitted = false;
      state.readySet.clear();
      readyBtn.disabled = false;
      // OD-001 Path A Sprint B: clear recruit state on phase reset.
      state.recruitedNpcIds.clear();
      state.recruitInFlight.clear();
      setStatus('');
    },
    // OD-001 Path A Sprint B test seam: inject compat table directly.
    setCompatTable(table) {
      state.compatTable = table && typeof table === 'object' ? table : {};
      renderRecruit();
    },
    // OD-001 Path A Sprint B test seam: read internal state for assertions.
    _getRecruitState() {
      return {
        recruited: [...state.recruitedNpcIds],
        inFlight: [...state.recruitInFlight],
      };
    },
  };
}

function findMyUnit(worldState, playerId) {
  if (!worldState || !Array.isArray(worldState.units)) return null;
  return (
    worldState.units.find((u) => u.owner_id === playerId) ||
    worldState.units.find((u) => u.owned_by === playerId) ||
    null
  );
}
