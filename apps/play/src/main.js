// Evo-Tactics Play — entry point. Orchestration layer.

import { api } from './api.js';
import { render, canvasToCell, needsAnimFrame } from './render.js';
import { renderUnits, appendLog, updateStatus, isUnitAlive, isUnitDead } from './ui.js';
import { renderAbilities, clearAbilities } from './abilityPanel.js';
import { detectEndgame, showEndgame, hideEndgame, nextScenarioId } from './endgame.js';
import {
  recordMove,
  pushPopup,
  pushPopupCritical,
  flashUnit,
  flashUnitCritical,
  attackRay,
  spawnVFX,
  ACTION_ANIM_STAGGER_MS,
  COMMIT_REVEAL_MS,
} from './anim.js';
import { openReplay } from './replayPanel.js';
import { sfx, setMuted, isMuted } from './sfx.js';
import { initHelpPanel } from './helpPanel.js';
import { showTip, buildRecoveryTipMessage, resetAllTips } from './tips.js';
import { toggleCodex, setCodexSessionId, setCodexCampaignId } from './codexPanel.js';
import { initFeedbackPanel } from './feedbackPanel.js';
import { initCampaignPanel } from './campaignPanel.js';
import { initLobbyBridgeIfPresent } from './lobbyBridge.js';
import { initFormsPanel, openFormsPanel } from './formsPanel.js';
import { initThoughtsPanel, openThoughtsPanel } from './thoughtsPanel.js';
import { initThoughtsRitualPanel, openRitualPanel } from './thoughtsRitualPanel.js';
import { initCharacterPanel, openCharacterPanel } from './characterPanel.js';
import { initProgressionPanel, openProgressionPanel } from './progressionPanel.js';
import { initSkivPanel, openSkivPanel } from './skivPanel.js';
import { initNestHub, openNestHub } from './nestHub.js';
import { renderSkillCheckPopups } from './skillCheckPopup.js';
import {
  formatPredictionRow,
  getPrediction,
  clearPredictionCache,
} from './predictPreviewOverlay.js';
import { renderObjectiveBar } from './objectivePanel.js';
import { renderBiomeChip } from './biomeChip.js';
import { renderCtBar } from './ctBar.js';
import { renderAmbitionHud } from './ambitionHud.js';
import {
  initAmbitionChoicePanel,
  openChoicePanel as openAmbitionChoicePanel,
  isChoiceLocked as isAmbitionChoiceLocked,
} from './ambitionChoicePanel.js';

const state = {
  sid: null,
  world: null, // session state
  selected: null, // unit selected (player)
  target: null, // target preview (enemy hovered)
  pendingAbility: null, // { ability_id, needs_target, effect_type }
  endgameShown: false,
  // W4.1 / W8k — round model client-side tracking per badge UI.
  // W8k: era Map<unit_id, intent> (latest-wins), ora array [{unit_id, action, ts}]
  // (append per multi-intent support). User può dichiarare N intents per unit
  // finché AP sufficiente (sum controlled backend side).
  pendingIntents: [],
  // W4.3 — resolution order from last commit (unit_id → priority rank 1..N)
  lastResolutionOrder: new Map(),
  // W4.6 — planning timer start timestamp (null = not active)
  planningTimerStart: null,
  // W5.D — eval set Flint v0.3 decision trace (JSONL pairs per decision)
  evalSet: [],
  // M8 Plan-Reveal P0 (ADR-2026-04-18): SIS threat_preview da /begin-planning.
  // Array [{actor_id, intent_type, intent_icon, target_id, threat_tiles}].
  // Consumato da render.js (icon) + main.js tooltip (label).
  // Reset a ogni begin-planning (nuovo round) o commit-round (resolved).
  threatPreview: [],
  // M12 Phase D — VC snapshot live pipe (ADR-2026-04-23 addendum).
  // Shape: { session_id, per_actor: { uid: { mbti_axes, mbti_type, ennea_themes, ... } }, round }.
  // Fetched from /api/session/:id/vc post-commitRound refresh, consumed by formsPanel.
  vcSnapshot: null,
  // M13 P6 Phase B — last mission_timer response (cached for auto-timeout inference).
  lastMissionTimer: null,
};

// W8b — Shared utility helpers (from Wave 8 research audit).
// getUnits: canonical unit list access (prima: 12+ repeated `state.world?.units || []`).
function getUnits(world) {
  return world && Array.isArray(world.units) ? world.units : [];
}

// getLocalStorageFlag: defensive localStorage boolean flag read (prima: 4 try/catch inline).
function getLocalStorageFlag(key, truthyValue = 'true', defaultValue = false) {
  try {
    return localStorage.getItem(key) === truthyValue;
  } catch {
    return defaultValue;
  }
}

// W7.B — ACTION_SPEED table mirror server-side (roundOrchestrator.py spec ADR-2026-04-15).
// Usato per predicted priority preview in planning phase (UX: user capisce ordine pre-commit).
const ACTION_SPEED = {
  defend: 2,
  parry: 2,
  attack: 0,
  ability: -1,
  move: -2,
};

// W7.B — Compute resolve priority order among declared player intents.
// Formula: unit.initiative + action_speed(action) - status_penalty.
// NOTE: include solo PG (SIS intents server-side, non esposti in planning).
// W8k — pendingIntents is array [{unit_id, action, ts}]. Compute priority per
// unique unit_id (primo intent determina rank base; multi-intent stessa unit
// risolti in ordine di declare per ADR-04-15 resolution queue ordering).
function computePlayerPriorityOrder(pendingIntents, units) {
  const seen = new Set();
  const items = [];
  for (const pi of pendingIntents) {
    if (seen.has(pi.unit_id)) continue;
    seen.add(pi.unit_id);
    const unit = units.find((u) => u.id === pi.unit_id);
    if (!unit) continue;
    const actSpd = ACTION_SPEED[pi.action?.type] ?? 0;
    const panic = (unit.status && unit.status.panic) || 0;
    const disorient = (unit.status && unit.status.disorient) || 0;
    const statusPenalty = panic * 2 + disorient;
    const priority = (unit.initiative || 0) + actSpd - statusPenalty;
    items.push({ uid: pi.unit_id, priority });
  }
  items.sort((a, b) => b.priority - a.priority || a.uid.localeCompare(b.uid));
  const map = new Map();
  items.forEach((it, i) => map.set(it.uid, i + 1));
  return map;
}

// W5.D — Build eval set entry per decision. Each entry = prompt (pre-action state)
// + response (user choice) pair per Flint v0.3 classifier gate.
function captureDecision(body) {
  if (!state.world) return;
  const actor = (state.world.units || []).find((u) => u.id === body.actor_id);
  if (!actor) return;
  const visibleEnemies = (state.world.units || [])
    .filter((u) => u.controlled_by === 'sistema' && u.hp > 0)
    .map((u) => ({ id: u.id, hp: `${u.hp}/${u.max_hp}`, pos: [u.position?.x, u.position?.y] }));
  const entry = {
    id: `t${state.world.turn}_${actor.id}_${state.evalSet.length + 1}`,
    ts: new Date().toISOString(),
    prompt: {
      session_id: state.sid,
      turn: state.world.turn,
      actor: actor.id,
      actor_job: actor.job,
      actor_hp: `${actor.hp}/${actor.max_hp}`,
      actor_ap: `${actor.ap_remaining ?? actor.ap}/${actor.ap}`,
      actor_pos: [actor.position?.x, actor.position?.y],
      visible_enemies: visibleEnemies,
      sistema_pressure: state.world.sistema_pressure,
      sistema_tier: state.world.sistema_tier,
    },
    response: {
      action_type: body.action_type,
      target_id: body.target_id || null,
      position: body.position || null,
      ability_id: body.ability_id || null,
    },
    meta: {
      round_flow: useRoundFlow() ? 'simultaneous' : 'sequential',
      confirm_action: useConfirmAction(),
    },
  };
  state.evalSet.push(entry);
}

// W5.D — Download eval set as JSONL (line-delimited JSON).
function downloadEvalSet() {
  if (state.evalSet.length === 0) {
    alert('Eval set vuoto. Gioca qualche azione prima.');
    return;
  }
  const jsonl = state.evalSet.map((e) => JSON.stringify(e)).join('\n');
  const blob = new Blob([jsonl], { type: 'application/x-jsonlines' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eval_set_flint_v0.3_${state.sid?.slice(0, 8) || 'nosid'}_${Date.now()}.jsonl`;
  a.click();
  URL.revokeObjectURL(url);
}
window.__dbg = window.__dbg || {};
window.__dbg.downloadEvalSet = downloadEvalSet;
window.__dbg.evalSetSize = () => state.evalSet.length;
// W8h — reset all tip seen flags (per re-playtest first-time flow).
window.__dbg.resetTips = resetAllTips;

// W4.6 — Planning timer 30s config + interval handle
const PLANNING_TIMER_MS = 30_000;
let planningTimerHandle = null;

const canvas = document.getElementById('grid');
const unitsUl = document.getElementById('units');
const logEl = document.getElementById('log');
const hintEl = document.getElementById('selected-hint');

// 2026-04-29 Spike POC BG3-lite Tier 1 — load ui_config.json on bootstrap.
// Toggle pre/post side-by-side: hide grid + range circle + AoE shape + smooth move.
// Fallback: tutto OFF (legacy grid square) se file mancante (back-compat strict).
async function _loadBg3liteConfig() {
  try {
    const res = await fetch('/data/ui_config.json', { cache: 'no-store' });
    if (!res.ok) return;
    const cfg = await res.json();
    window.__evoUiConfig = Object.assign({}, window.__evoUiConfig || {}, cfg);
    if (canvas) {
      if (cfg.bg3lite_hide_grid) canvas.classList.add('bg3lite-hide-grid');
      if (cfg.bg3lite_range_circle) canvas.classList.add('bg3lite-range-circle');
      if (cfg.bg3lite_smooth_movement) canvas.classList.add('bg3lite-smooth-movement');
    }
    // Trigger redraw post-load se world già caricato.
    if (state.sid && state.world) requestAnimationFrame(() => redraw());
  } catch {
    /* config opzionale, silent fallback a legacy grid */
  }
}
_loadBg3liteConfig();

function redraw() {
  // W8b — guard: session must be active AND world state loaded.
  if (!state.sid || !state.world) return;
  render(canvas, state.world, {
    selected: state.selected,
    target: state.target,
    active: state.world.active_unit,
    resolutionOrder: state.lastResolutionOrder,
    // M8 Plan-Reveal P0: SIS intent icons + threat tile highlight
    threatPreview: state.threatPreview,
  });
  const predictedOrder = computePlayerPriorityOrder(state.pendingIntents, state.world.units || []);
  renderUnits(
    unitsUl,
    state.world,
    state.selected,
    handleUnitClick,
    state.pendingIntents,
    handleCancelIntent,
    predictedOrder,
  );
  updateStatus(state.world);
  // Bundle B.2 — Undo button visibility (planning phase + selected unit has pending).
  const undoBtn = document.getElementById('undo-action');
  if (undoBtn) {
    const hasPending =
      state.selected &&
      state.pendingIntents.some((pi) => pi.unit_id === state.selected && !pi.reaction_trigger);
    undoBtn.classList.toggle('hidden', !hasPending);
  }
  // TKT-P6-FE — Rewind button state (budget + disabled when exhausted or empty).
  const rewindBtn = document.getElementById('rewind-action');
  const rewindBudgetEl = document.getElementById('rewind-budget');
  if (rewindBtn && rewindBudgetEl) {
    const rw = state.world?.rewind || { budget_remaining: 3, budget_max: 3, snapshots_count: 0 };
    const budgetRemaining = Number(rw.budget_remaining) || 0;
    const budgetMax = Number(rw.budget_max) || 3;
    const snapshotsCount = Number(rw.snapshots_count) || 0;
    rewindBudgetEl.textContent = `${budgetRemaining}/${budgetMax}`;
    const canRewind = budgetRemaining > 0 && snapshotsCount > 0;
    rewindBtn.disabled = !canRewind;
  }
  // ability panel
  const selUnit = (state.world.units || []).find((u) => u.id === state.selected);
  if (selUnit && selUnit.controlled_by === 'player' && selUnit.hp > 0) {
    renderAbilities(selUnit, state.world, handleAbilitySelect);
  } else {
    clearAbilities();
  }
  // endgame
  if (!state.endgameShown) {
    const outcome = detectEndgame(state.world);
    if (outcome) {
      state.endgameShown = true;
      if (outcome === 'victory') sfx.win();
      else sfx.defeat();
      // M19 — if coop host, notify server to transition phase → debrief.
      if (lobbyBridge?.isHost && lobbyBridge.session?.code && lobbyBridge.session?.token) {
        const survivors = (state.world.units || [])
          .filter((u) => u && u.controlled_by === 'player' && u.hp > 0)
          .map((u) => u.id);
        const xpEarned = outcome === 'victory' ? 10 : 2;
        api
          .coopCombatEnd(lobbyBridge.session.code, lobbyBridge.session.token, {
            outcome,
            xp_earned: xpEarned,
            survivors,
          })
          .catch((err) => console.warn('[coop] combatEnd', err));
      }
      showEndgame(
        outcome,
        { ...state.world, session_id: state.sid },
        {
          next: async () => {
            const cur = document.getElementById('scenario-select').value;
            const nxt = nextScenarioId(cur);
            document.getElementById('scenario-select').value = nxt;
            hideEndgame();
            await startNewSession();
          },
          retry: async () => {
            hideEndgame();
            await startNewSession();
          },
        },
      );
    }
  }
}

function updateHint(msg) {
  hintEl.textContent = msg;
}

function setAbilityTargetMode(on) {
  document.body.classList.toggle('ability-target-mode', on);
  const cancelBtn = document.getElementById('cancel-pending');
  if (cancelBtn) cancelBtn.classList.toggle('hidden', !on);
}

function cancelPendingAbility(silent = false) {
  if (!state.pendingAbility && !document.body.classList.contains('ability-target-mode')) return;
  state.pendingAbility = null;
  setAbilityTargetMode(false);
  if (!silent) updateHint("Ability annullata. Seleziona un'altra azione.");
}

function handleAbilitySelect(ab) {
  if (!state.selected) return;

  // Click ability mentre un'altra pending → cancella precedente e ricomincia
  if (state.pendingAbility) {
    cancelPendingAbility(true);
  }

  // Self-cast senza target + senza position (es. buff fortify)
  if (!ab.needs_target && !ab.needs_position) {
    doAction({
      action_type: 'ability',
      actor_id: state.selected,
      ability_id: ab.ability_id,
    });
    return;
  }

  // Ability self-position (es. evasive_maneuver: target=self + position destinazione)
  // Inizia direttamente pickPosition step
  if (!ab.needs_target && ab.needs_position) {
    state.pendingAbility = { ...ab, collected_target: state.selected, awaiting: 'position' };
    setAbilityTargetMode(true);
    updateHint(
      `${ab.ability_id}: click cella destinazione (max ${ab.move_distance} celle). ESC annulla.`,
    );
    return;
  }

  // Ability con target (enemy/ally) + position (move_attack) → 2 step: target poi position
  // Oppure solo target (attack, debuff, heal) → 1 step: target
  state.pendingAbility = { ...ab, awaiting: 'target' };
  setAbilityTargetMode(true);
  const kind =
    ab.target_kind === 'enemy' ? 'nemico' : ab.target_kind === 'ally' ? 'alleato' : 'unità';
  updateHint(
    `${ab.ability_id}: click ${kind} target${ab.needs_position ? ' (poi click cella destinazione)' : ''}. ESC annulla.`,
  );
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state.pendingAbility) {
      cancelPendingAbility();
    }
    // M4 A.2 — ESC cancella pending confirm action
    if (_pendingConfirm) {
      _pendingConfirm = null;
      updateHint('Pending cancellato. Seleziona unità o altra azione.');
      redraw();
    }
  }
});

// W6.2b / W8k / W8k2 — Cancel TUTTI intent per una unit.
// W8k2 CRITICAL FIX (user feedback run5): prima clear solo client-side →
// backend manteneva pending_intents → timer scaduto → attacchi cancellati
// partivano comunque. Ora chiamiamo api.clearIntent(sid, unitId) per sync server.
async function handleCancelIntent(unitId) {
  const before = state.pendingIntents.length;
  state.pendingIntents = state.pendingIntents.filter((pi) => pi.unit_id !== unitId);
  const removed = before - state.pendingIntents.length;
  if (removed === 0) return;
  // W8k2 — sync backend: rimuovi pending_intents per questa unit server-side.
  if (state.sid) {
    try {
      await api.clearIntent(state.sid, unitId);
    } catch {
      /* backend may be offline; client state già pulito */
    }
  }
  appendLog(logEl, `${unitId}: ${removed} intent annullati (client+server)`);
  updateHint(`${removed} intent ${unitId} annullati. Re-pianifica o "Fine turno".`);
  redraw();
}

// W8k / W8k2 — ESC global: annulla TUTTI pending intents (client + server).
document.addEventListener('keydown', async (ev) => {
  if (ev.key === 'Escape' && state.pendingIntents.length > 0 && !state.pendingAbility) {
    const n = state.pendingIntents.length;
    const uniqueUnits = [...new Set(state.pendingIntents.map((pi) => pi.unit_id))];
    state.pendingIntents = [];
    // W8k2 CRITICAL — backend clear per ogni unit affetta (altrimenti timer
    // scaduto risolverebbe intent già annullati client-side).
    if (state.sid) {
      for (const uid of uniqueUnits) {
        try {
          await api.clearIntent(state.sid, uid);
        } catch {
          /* ignore */
        }
      }
    }
    appendLog(logEl, `ESC: ${n} intent annullati (client+server)`);
    updateHint(`${n} intent cleared. Ri-pianifica round.`);
    redraw();
  }
});

// W8e — Enter key = "Fine turno" shortcut (keyboard alternative to button).
// Skip se focus è dentro input/textarea/select o help modal aperto.
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter') return;
  const active = document.activeElement;
  if (active && /^(input|textarea|select|button)$/i.test(active.tagName)) return;
  const helpOpen =
    document.getElementById('help-panel') &&
    !document.getElementById('help-panel').classList.contains('hidden');
  if (helpOpen) return;
  if (!state.sid) return;
  ev.preventDefault();
  document.getElementById('end-turn').click();
});

// Bundle B.2 — Ctrl+Z = Undo last action (planning phase only).
async function handleUndoAction() {
  if (!state.sid || !state.selected) return;
  const before = state.pendingIntents.length;
  // Pop last intent for selected unit client-side (mirror server LIFO).
  for (let i = state.pendingIntents.length - 1; i >= 0; i -= 1) {
    if (state.pendingIntents[i].unit_id === state.selected) {
      state.pendingIntents.splice(i, 1);
      break;
    }
  }
  const r = await api.undoAction(state.sid, state.selected);
  if (!r.ok) {
    appendLog(logEl, `✖ undo: ${r.data?.error || r.status}`, 'warn');
    return;
  }
  if (state.pendingIntents.length < before) {
    appendLog(logEl, `↶ undo: 1 intent rimosso (${state.selected})`);
    updateHint(`Ultima azione di ${state.selected} annullata.`);
    redraw();
  }
}
document.addEventListener('keydown', (ev) => {
  if (!(ev.ctrlKey || ev.metaKey) || ev.key !== 'z') return;
  const active = document.activeElement;
  if (active && /^(input|textarea|select)$/i.test(active.tagName)) return;
  ev.preventDefault();
  handleUndoAction();
});

// TKT-P6-FE — Rewind safety valve handler.
// POST /api/session/:id/rewind restituisce nuovo state (publicSessionView).
// Su 409 budget esaurito o buffer vuoto: log warn + UI rimane invariata.
async function handleRewindAction() {
  if (!state.sid) return;
  const r = await api.rewindAction(state.sid);
  if (!r.ok) {
    const reason = r.data?.reason || r.data?.error || `HTTP ${r.status}`;
    appendLog(logEl, `✖ rewind: ${reason}`, 'warn');
    return;
  }
  state.world = r.data?.state || state.world;
  state.pendingIntents = [];
  const rw = r.data?.rewind || {};
  appendLog(
    logEl,
    `↶ Turno annullato (budget ${rw.budget_remaining ?? '?'}/${state.world?.rewind?.budget_max ?? 3})`,
  );
  updateHint('Ultimo turno annullato. Rigioca la stessa scelta o cambia tattica.');
  redraw();
}

function handleUnitClick(unit) {
  if (!state.world) return;
  // Ability targeting mode
  if (state.pendingAbility) {
    const ab = state.pendingAbility;
    if (ab.awaiting === 'target') {
      ab.collected_target = unit.id;
      if (ab.needs_position) {
        ab.awaiting = 'position';
        updateHint(
          `${ab.ability_id}: target=${unit.id}. Ora click cella destinazione (max ${ab.move_distance}). ESC annulla.`,
        );
        return;
      }
      // Target only → submit
      state.pendingAbility = null;
      setAbilityTargetMode(false);
      doAction({
        action_type: 'ability',
        actor_id: state.selected,
        ability_id: ab.ability_id,
        target_id: unit.id,
      });
      return;
    }
    // Awaiting position but user clicked unit → ignore
    updateHint(`Click cella vuota per destinazione (ESC annulla).`);
    return;
  }
  if (unit.controlled_by === 'player') {
    if (unit.hp <= 0) {
      updateHint(`${unit.id} è KO.`);
      return;
    }
    state.selected = unit.id;
    state.target = null;
    sfx.select();
    updateHint(`Selezionato ${unit.id}. Click cella=move · click nemico=attack · sidebar=ability.`);
    redraw();
    // W8h — onboarding tips (first-time only). Range overlay visible → spiega colori.
    showTip('select-unit');
    setTimeout(() => showTip('range-overlay'), 900);
  } else {
    if (!state.selected) {
      updateHint('Seleziona prima una tua unità.');
      return;
    }
    doAction({ action_type: 'attack', actor_id: state.selected, target_id: unit.id });
  }
}

function findUnitAt(x, y) {
  return (state.world?.units || []).find(
    (u) => u.hp > 0 && u.position && u.position.x === x && u.position.y === y,
  );
}

// W2.5 — Hover tooltip su canvas: intent SIS, HP/AP, job, status
// Sprint 4 §I (2026-04-27) — Cogmind stratified tooltip pattern (Tier B #3).
// Source: docs/research/2026-04-26-tier-b-extraction-matrix.md.
// Pattern: BASE info sempre visibile + EXPAND on hold/Shift per dettagli
// (trait list, resistances, AP cost breakdown). UI a strati = leggibilità.
const tooltipEl = document.getElementById('unit-tooltip');
let _tooltipExpanded = false;

function _buildExpandedSection(unit) {
  // Cogmind expand: trait list (top 6 + count rest) + resistances + ability cost.
  const traits = Array.isArray(unit.traits) ? unit.traits : [];
  const headTraits = traits.slice(0, 6);
  const rest = Math.max(0, traits.length - 6);
  const traitsTxt = headTraits.length
    ? `<div class="tt-section"><strong>Trait</strong> · ${headTraits
        .map((t) => `<code>${String(t).replace(/_/g, ' ')}</code>`)
        .join(', ')}${rest > 0 ? ` <em>+${rest}</em>` : ''}</div>`
    : '';
  const resistances = Array.isArray(unit._resistances) ? unit._resistances : [];
  const resTxt = resistances.length
    ? `<div class="tt-section"><strong>Resist</strong> · ${resistances
        .filter((r) => r && r.modifier_pct != null && r.modifier_pct !== 0)
        .map((r) => `${r.channel} ${r.modifier_pct > 0 ? '+' : ''}${r.modifier_pct}%`)
        .join(' · ')}</div>`
    : '';
  const sentience = unit.sentience_tier ? `T${String(unit.sentience_tier).replace(/^T/, '')}` : '';
  const species = unit.species_id || unit.species || '';
  const speciesTxt = species
    ? `<div class="tt-section"><strong>Specie</strong> · ${species}${sentience ? ` <span class="tt-sentience">${sentience}</span>` : ''}</div>`
    : '';
  const phase = unit.lifecycle_phase || unit.phase || '';
  const phaseTxt = phase ? `<div class="tt-section"><strong>Fase</strong> · ${phase}</div>` : '';
  return `${speciesTxt}${phaseTxt}${traitsTxt}${resTxt}`;
}

function buildUnitTooltip(unit) {
  if (!unit) return '';
  const faction = unit.controlled_by === 'player' ? 'player' : 'sistema';
  const factionLabel = faction === 'player' ? 'Tua unità' : 'Sistema';
  const job = unit.job || unit.class || '—';
  const hp = `${unit.hp}/${unit.max_hp || unit.hp}`;
  const ap = unit.ap_remaining != null ? `${unit.ap_remaining}/${unit.ap || 0}` : `${unit.ap || 0}`;
  const statusKeys = Object.entries(unit.status || {})
    .filter(([, v]) => v !== undefined && v !== null && (typeof v !== 'number' || v > 0))
    .map(([k]) => k);
  const statusTxt = statusKeys.length ? `Status: ${statusKeys.join(', ')}` : '';
  let intentBlock = '';
  if (faction === 'sistema' && unit.hp > 0) {
    // M8 Plan-Reveal P0 (ADR-2026-04-18): real intent from threat_preview
    // payload populated on /round/begin-planning. Fallback 'attacco' se
    // preview vuota (legacy flow / pre-declare phase).
    const preview = Array.isArray(state.threatPreview) ? state.threatPreview : [];
    const row = preview.find((r) => r && r.actor_id === unit.id);
    const glyphMap = { fist: '✊', move: '➜', shield: '🛡', '?': '?' };
    const labelMap = {
      attack: 'attacco',
      move: 'movimento',
      approach: 'avvicinamento',
      retreat: 'ritirata',
      skip: 'difesa',
      defend: 'difesa',
      overwatch: 'sentinella',
    };
    if (row) {
      const glyph = glyphMap[row.intent_icon] || '?';
      const label = labelMap[row.intent_type] || row.intent_type || 'ignoto';
      const targetTxt = row.target_id ? ` → ${row.target_id}` : '';
      intentBlock = `<span class="tt-intent">${glyph} Intento: ${label}${targetTxt}</span>`;
    } else {
      intentBlock = `<span class="tt-intent">✊ Intento: attacco</span>`;
    }
  }
  // Sprint 4 §I — Cogmind expand hint (Shift) for stratified detail layer.
  const expandHint = _tooltipExpanded
    ? `<div class="tt-expand-hint open"><kbd>Shift</kbd> rilascia per chiudere</div>`
    : `<div class="tt-expand-hint">Tieni <kbd>Shift</kbd> per dettagli</div>`;
  const expanded = _tooltipExpanded ? _buildExpandedSection(unit) : '';
  return `
    <strong>${unit.id}</strong>
    <div class="tt-faction-${faction}">${factionLabel} · <em>${job}</em></div>
    <div>HP ${hp} · AP ${ap}</div>
    ${statusTxt ? `<div>${statusTxt}</div>` : ''}
    ${intentBlock}
    ${expanded}
    ${expandHint}
  `;
}

// Sprint 4 §I — Shift toggle: tooltip expand ON while held.
window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Shift' && !_tooltipExpanded) {
    _tooltipExpanded = true;
    // Re-render current tooltip if visible.
    if (tooltipEl && !tooltipEl.classList.contains('hidden')) {
      const lastUnit = tooltipEl.dataset.lastUnitId;
      if (lastUnit) {
        const u = findUnitById(lastUnit);
        if (u) tooltipEl.innerHTML = buildUnitTooltip(u);
      }
    }
  }
});
window.addEventListener('keyup', (ev) => {
  if (ev.key === 'Shift' && _tooltipExpanded) {
    _tooltipExpanded = false;
    if (tooltipEl && !tooltipEl.classList.contains('hidden')) {
      const lastUnit = tooltipEl.dataset.lastUnitId;
      if (lastUnit) {
        const u = findUnitById(lastUnit);
        if (u) tooltipEl.innerHTML = buildUnitTooltip(u);
      }
    }
  }
});

function findUnitById(id) {
  if (!state.world || !Array.isArray(state.world.units)) return null;
  return state.world.units.find((u) => u && u.id === id) || null;
}

canvas.addEventListener('mousemove', (ev) => {
  if (!state.world || !tooltipEl) return;
  const { x, y } = canvasToCell(canvas, ev, state.world.grid.height);
  const unit = findUnitAt(x, y);
  if (!unit) {
    tooltipEl.classList.add('hidden');
    return;
  }
  tooltipEl.innerHTML = buildUnitTooltip(unit);
  tooltipEl.dataset.lastUnitId = unit.id;
  // Sprint 8 (Surface-DEAD #1): hover su nemico con player selezionato →
  // fetch async predict_combat e inietta prediction row in tooltip.
  // Caller-side gate: target deve essere alive + faction enemy + state.selected
  // deve essere player vivo. Cache evita flood backend (1 fetch per tuple).
  const selected = state.selected
    ? (state.world.units || []).find((u) => u && u.id === state.selected)
    : null;
  if (
    state.sid &&
    selected &&
    selected.controlled_by === 'player' &&
    Number(selected.hp || 0) > 0 &&
    unit.controlled_by === 'sistema' &&
    Number(unit.hp || 0) > 0 &&
    unit.id !== selected.id
  ) {
    const targetId = unit.id;
    const actorId = selected.id;
    const sid = state.sid;
    getPrediction(sid, actorId, targetId, api.predict).then((prediction) => {
      // Re-check tooltip stato: utente potrebbe aver mossa il mouse altrove.
      if (
        !tooltipEl ||
        tooltipEl.classList.contains('hidden') ||
        tooltipEl.dataset.lastUnitId !== targetId
      ) {
        return;
      }
      if (!prediction) return;
      // Append prediction row a fine tooltip, sopra l'expand-hint.
      const html = formatPredictionRow(prediction);
      // Idempotent: rimuove vecchia row prima di inserire (sequential hover same target).
      const existing = tooltipEl.querySelector('.tt-predict');
      if (existing) existing.remove();
      const expandHint = tooltipEl.querySelector('.tt-expand-hint');
      if (expandHint) {
        expandHint.insertAdjacentHTML('beforebegin', html);
      } else {
        tooltipEl.insertAdjacentHTML('beforeend', html);
      }
    });
  }
  // M7 fix: boundary-aware positioning. Se tooltip esce da viewport
  // riposiziona a sx/sopra del cursore. Evita clip dietro canvas/panels.
  tooltipEl.classList.remove('hidden');
  const ttRect = tooltipEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const offset = 14;
  let left = ev.clientX + offset;
  let top = ev.clientY + offset;
  if (left + ttRect.width + 8 > vw) {
    left = ev.clientX - ttRect.width - offset;
  }
  if (top + ttRect.height + 8 > vh) {
    top = ev.clientY - ttRect.height - offset;
  }
  // Clamp a viewport minima
  left = Math.max(8, left);
  top = Math.max(8, top);
  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
});

canvas.addEventListener('mouseleave', () => {
  if (tooltipEl) tooltipEl.classList.add('hidden');
});

canvas.addEventListener('click', (ev) => {
  if (!state.world) return;
  const { x, y } = canvasToCell(canvas, ev, state.world.grid.height);
  if (x < 0 || x >= state.world.grid.width || y < 0 || y >= state.world.grid.height) return;

  const unit = findUnitAt(x, y);
  if (unit) {
    handleUnitClick(unit);
    return;
  }
  if (state.pendingAbility) {
    const ab = state.pendingAbility;
    if (ab.awaiting === 'position') {
      // Submit ability con target (può essere self o collected) + position
      state.pendingAbility = null;
      setAbilityTargetMode(false);
      doAction({
        action_type: 'ability',
        actor_id: state.selected,
        ability_id: ab.ability_id,
        target_id: ab.collected_target || state.selected,
        position: { x, y },
      });
      return;
    }
    updateHint(`Ability richiede unit target. Premi ESC per annullare.`);
    return;
  }
  if (!state.selected) {
    updateHint('Click su una tua unità per selezionarla.');
    return;
  }
  doAction({ action_type: 'move', actor_id: state.selected, position: { x, y } });
});

// M4 A.1 / W3 — Feature flag round model simultaneous (default ON post Wave 3).
// Opt-out: localStorage.setItem('evo:round-flow','sequential') per regression test.
function useRoundFlow() {
  // Inverted check: NOT 'sequential' = default ON (any other value = simultaneous).
  try {
    return localStorage.getItem('evo:round-flow') !== 'sequential';
  } catch {
    return true;
  }
}

// M4 A.2 — Feature flag confirm action (opt-in).
const useConfirmAction = () => getLocalStorageFlag('evo:confirm-action');

// Pending confirm state: { body, tag, ts }. Reset su cancel o commit.
let _pendingConfirm = null;
// Debug: expose pending per inspect via preview_eval
window.__dbg = window.__dbg || {};
Object.defineProperty(window.__dbg, 'pendingConfirm', {
  get() {
    return _pendingConfirm;
  },
});

function confirmMatch(prev, next) {
  if (!prev) return false;
  if (prev.body.action_type !== next.action_type) return false;
  if (prev.body.actor_id !== next.actor_id) return false;
  if (next.action_type === 'attack' || next.action_type === 'ability') {
    return prev.body.target_id === next.target_id;
  }
  if (next.action_type === 'move') {
    return prev.body.position?.x === next.position?.x && prev.body.position?.y === next.position?.y;
  }
  return false;
}

async function doAction(body) {
  // W8b — guard: both session + world must exist (doAction reads state.world units).
  if (!state.sid || !state.world) return;
  // Safety: hard clear any pending ability + target mode prima di ogni action
  cancelPendingAbility(true);
  body.session_id = state.sid;

  // W5.D — capture decision pre-commit for Flint v0.3 eval set.
  // Non duplica su confirm pending (skip primo click confirm).
  if (!useConfirmAction() || _pendingConfirm != null) {
    captureDecision(body);
  }

  // Confirm action: primo click pending, secondo click stessa action = commit
  if (useConfirmAction()) {
    if (!confirmMatch(_pendingConfirm, body)) {
      _pendingConfirm = { body: { ...body }, ts: Date.now() };
      const tag = body.ability_id
        ? `ability ${body.ability_id}${body.target_id ? ` → ${body.target_id}` : ''}`
        : body.action_type === 'move'
          ? `move [${body.position.x},${body.position.y}]`
          : `atk ${body.target_id}`;
      updateHint(`⏳ PENDING ${tag} — click di nuovo per confermare, ESC per annullare`);
      redraw();
      return;
    }
    // Seconda click = confirm
    _pendingConfirm = null;
  }

  // Round flow simultaneous: declare intent invece di action immediate
  if (useRoundFlow()) {
    // Map body → action shape per declareIntent.
    // W8d — Math.max(0, ...) clamp: ap_cost non può essere negativo (defensive vs
    // malformed client body + backend side).
    const rawApCost =
      body.action_type === 'attack'
        ? 1
        : body.action_type === 'move'
          ? manhattanApCost(body)
          : body.action_type === 'ability'
            ? body.ap_cost || 1
            : 0;
    const apCost = Math.max(0, Number(rawApCost) || 0);
    const action = {
      type: body.action_type,
      actor_id: body.actor_id,
      ap_cost: apCost,
    };
    if (body.action_type === 'attack') action.target_id = body.target_id;
    if (body.action_type === 'move') action.move_to = body.position;
    if (body.action_type === 'ability') {
      action.ability_id = body.ability_id;
      action.target_id = body.target_id;
      if (body.position) action.position = body.position;
    }
    // W8N — AP budget check client-side: somma ap_cost pending per actor,
    // verifica (total + apCost) ≤ actor.ap. User feedback: multi-intent non
    // teneva conto del budget AP. Reject + tip se insufficient.
    const actorUnit = getUnits(state.world).find((u) => u.id === body.actor_id);
    const actorAp = Number(actorUnit?.ap_remaining ?? actorUnit?.ap ?? 0);
    const alreadyPending = state.pendingIntents
      .filter((pi) => pi.unit_id === body.actor_id)
      .reduce((sum, pi) => sum + (Number(pi.action?.ap_cost) || 0), 0);
    const remaining = actorAp - alreadyPending;
    if (apCost > remaining) {
      appendLog(
        logEl,
        `✖ ${body.actor_id}: AP insufficiente (serve ${apCost}, residuo ${remaining}/${actorAp})`,
        'error',
      );
      updateHint(
        `❌ AP insufficiente: ${body.actor_id} ha ${remaining}/${actorAp} AP, questa azione costa ${apCost}. Annulla un intent o scegli azione meno costosa.`,
      );
      showTip(
        'invalid-action',
        `⚡ AP insufficiente. ${body.actor_id} ha già ${alreadyPending} AP pending su ${actorAp} totali. Serve ${apCost} AP per questa azione ma restano solo ${remaining}. Rimuovi un intent (✕ sidebar) o ESC per reset totale.`,
      );
      return;
    }
    // Ensure roundState initialized
    if (!state.roundInit) {
      const bp = await api.beginPlanning(state.sid);
      if (!bp.ok) {
        appendLog(logEl, `✖ begin-planning: ${bp.data?.error || bp.status}`, 'error');
        return;
      }
      state.roundInit = true;
      // M8 Plan-Reveal P0: store SIS threat preview per render + tooltip
      state.threatPreview = Array.isArray(bp.data?.threat_preview) ? bp.data.threat_preview : [];
      // W4.6 — start planning timer on first declare
      startPlanningTimer();
    }
    const r = await api.declareIntent(state.sid, body.actor_id, action);
    if (!r.ok) {
      appendLog(logEl, `✖ ${r.data?.error || `HTTP ${r.status}`}`, 'error');
      updateHint(`❌ ${r.data?.error || 'Intent rifiutato.'} · riprova`);
      // W8h — Error recovery tip: parse error → specific tip (first time error only).
      const recovery = buildRecoveryTipMessage(r.data?.error || '');
      if (recovery) showTip('invalid-action', recovery);
      return;
    }
    // W4.1 / W8k — track intent client-side per badge sidebar. Multi-intent
    // per unit (array append). Backend anche append post-W8k.
    state.pendingIntents.push({ unit_id: body.actor_id, action, ts: Date.now() });
    const tag = body.ability_id
      ? `→ ability ${body.ability_id}${body.target_id ? ` → ${body.target_id}` : ''}`
      : body.action_type === 'move'
        ? `→ move [${body.position.x},${body.position.y}]`
        : `→ atk ${body.target_id}`;
    appendLog(logEl, `${body.actor_id}: ${tag} (pending)`);
    redraw();
    // W8h / W8L — Onboarding tip (solo first-time per action type).
    // W8L fix: rimosso setTimeout intent-declared redundant (sovrapponeva +
    // user non poteva leggere first-move perché chiudeva subito). Content
    // già in first-move/first-attack page 2.
    if (body.action_type === 'move') showTip('first-move');
    else if (body.action_type === 'attack') showTip('first-attack');
    else if (body.action_type === 'ability') showTip('first-ability');
    // W6.1 — Auto-commit rimosso (user bug report: "scatta il round appena clicco secondo PG").
    // Explicit "Fine turno" only. User può re-declare per cambiare idea.
    // Opt-in tramite localStorage flag `evo:auto-commit` = 'true' (power-user).
    const alivePlayers = (state.world?.units || []).filter(
      (u) => u.controlled_by === 'player' && u.hp > 0,
    );
    // W8k — allDeclared true se ogni PG vivo ha almeno 1 intent in array.
    const declaredUnitIds = new Set(state.pendingIntents.map((pi) => pi.unit_id));
    const allDeclared = alivePlayers.every((u) => declaredUnitIds.has(u.id));
    if (allDeclared && alivePlayers.length > 0) {
      const autoCommit = getLocalStorageFlag('evo:auto-commit');
      if (autoCommit) {
        updateHint(`✓ Tutti dichiarati. Auto-commit 250ms…`);
        setTimeout(() => triggerCommitRound(), 250);
      } else {
        updateHint(
          `✓ Tutti i player dichiarati (${alivePlayers.length}/${alivePlayers.length}). Click "Fine turno" per risolvere — o re-click per cambiare intent.`,
        );
      }
    } else {
      const remaining = alivePlayers.length - declaredUnitIds.size;
      updateHint(
        `✓ Intent dichiarato ${body.actor_id}. ${remaining} PG restante/i. Click "Fine turno" per risolvere.`,
      );
    }
    return;
  }

  // Legacy flow (default OFF): action immediate
  const r = await api.action(body);
  if (!r.ok) {
    appendLog(logEl, `✖ ${r.data?.error || `HTTP ${r.status}`}`, 'error');
    updateHint(`❌ ${r.data?.error || 'Azione rifiutata.'} · riprova o seleziona altra azione.`);
    return;
  }
  const tag = body.ability_id
    ? `ability ${body.ability_id}${body.target_id ? ` → ${body.target_id}` : ''}`
    : body.action_type === 'move'
      ? `move [${body.position.x},${body.position.y}]`
      : `atk ${body.target_id}`;
  appendLog(logEl, `${body.actor_id}: ${tag}`);

  // 2026-05-10 TKT-BOND-HUD-SURFACE Phase B (verdict #A2 = A).
  // Surface bond_reaction trigger nel log player-visible. Backend
  // emette bond_reaction field in /api/session/action response
  // (apps/backend/routes/session.js:932). Pre-fix: response field
  // ignorato → engine LIVE / surface DEAD Gate 5 violation.
  if (r.data?.bond_reaction?.triggered) {
    const bond = r.data.bond_reaction;
    const buffSummary = bond.buff_applied
      ? `${bond.buff_applied.stat} +${bond.buff_applied.amount} (${bond.buff_applied.duration}t)`
      : '';
    appendLog(
      logEl,
      `🔗 LEGAME ${bond.bond_id || '?'}: ${bond.actor_id}+${bond.ally_id} → ${buffSummary}`,
      'success',
    );
  }
  // Multi-bond stack (line 939: beast_bond_reactions: [...]).
  if (Array.isArray(r.data?.beast_bond_reactions) && r.data.beast_bond_reactions.length > 0) {
    for (const bb of r.data.beast_bond_reactions) {
      if (bb?.triggered) {
        appendLog(logEl, `🔗 Bond stack ${bb.bond_id}: ${bb.actor_id}+${bb.ally_id}`, 'success');
      }
    }
  }
  await refresh();
}

function manhattanApCost(body) {
  if (!state.world || !body.actor_id || !body.position) return 1;
  const actor = (state.world.units || []).find((u) => u.id === body.actor_id);
  if (!actor || !actor.position) return 1;
  return (
    Math.abs(body.position.x - actor.position.x) + Math.abs(body.position.y - actor.position.y)
  );
}

// Track last events count to detect new events for anim
let lastEventsCount = 0;

// W8c — Colori FX centralized per consistency (Refactor C: color tokens).
const FX_COLORS = {
  rayPlayer: '#ffcc00',
  raySistema: '#ff5252',
  damage: '#ff5252',
  heal: '#4caf50',
};

// W8c — Shared damage/heal FX trigger (Refactor A: prima duplicato 2× in
// processNewEvents + processIaActions). Signature single: actor+target+damage → fire FX+SFX.
// Input: actor/target = unit object (with position), damage = number (neg=heal, pos=damage, 0=miss).
// Side effects: attackRay + pushPopup + flashUnit + sfx.hit/crit/heal/miss.
function handleDamageEvent({ actor, target, damage, targetId, result }) {
  const dmg = Number(damage || 0);
  // Attack ray: actor → target (faction-colored).
  if (actor?.position && target?.position) {
    const rayColor = actor.controlled_by === 'sistema' ? FX_COLORS.raySistema : FX_COLORS.rayPlayer;
    attackRay(actor.position, target.position, rayColor);
  }
  // Damage popup + flash on target (skip if dmg === 0 / miss).
  // Tier B FF7R critical juice: dmg >= 6 = critical → extended flash (720ms vs 480ms)
  // + popup gold color + 1.5× scale (rendered by drawPopups via critical flag).
  if (target?.position && dmg !== 0) {
    const isCritical = dmg >= 6; // damage threshold matches sfx.crit() heuristic
    const color = dmg < 0 ? FX_COLORS.heal : isCritical ? '#ffcc00' : FX_COLORS.damage;
    const txt = dmg < 0 ? `+${-dmg}` : `-${dmg}`;
    if (isCritical && dmg > 0) {
      pushPopupCritical(target.position.x, target.position.y, txt, color);
      flashUnitCritical(targetId || target.id, color);
    } else {
      pushPopup(target.position.x, target.position.y, txt, color);
      flashUnit(targetId || target.id, color);
    }
    // Sprint G v3 — VFX hit on target (Legacy Collection).
    if (dmg > 0) spawnVFX('hit', target.position.x, target.position.y);
  }
  // Sprint G v3 — death VFX se target HP cala a 0.
  if (target && dmg > 0 && target.hp !== undefined && target.hp - dmg <= 0) {
    spawnVFX('death', target.position.x, target.position.y);
  }
  // SFX selection: heal / crit (≥6) / hit / miss.
  if (dmg < 0) sfx.heal();
  else if (dmg > 0) dmg >= 6 ? sfx.crit() : sfx.hit();
  else if (result === 'miss' || result === 'MISS' || dmg === 0) sfx.miss();
}

function processNewEvents(prevWorld, newWorld) {
  const events = (newWorld?.events || []).slice(lastEventsCount);
  for (const ev of events) {
    if (ev.action_type === 'move' && ev.position_from && ev.position_to) {
      recordMove(
        ev.actor_id,
        { x: ev.position_from[0], y: ev.position_from[1] },
        { x: ev.position_to[0], y: ev.position_to[1] },
      );
    }
    if (
      (ev.action_type === 'attack' || ev.action_type === 'ability') &&
      ev.damage_dealt !== undefined &&
      ev.target_id
    ) {
      const target = getUnits(newWorld).find((u) => u.id === ev.target_id);
      const actor = getUnits(newWorld).find((u) => u.id === ev.actor_id);
      handleDamageEvent({
        actor,
        target,
        damage: ev.damage_dealt,
        targetId: ev.target_id,
        result: ev.result,
      });
      // Sprint 7 (B.1.8 #3): Disco passive→active skill check popup.
      // Surface trait_effects[] entries triggered=true sopra l'actor con
      // stile diegetico. No-op se nessun trait passivo è triggerato.
      if (actor && Array.isArray(ev.trait_effects) && ev.trait_effects.length > 0) {
        renderSkillCheckPopups(ev, actor, pushPopup);
      }
    }
  }
  lastEventsCount = (newWorld?.events || []).length;
}

// M12 Phase D — pipe VC snapshot to state for formsPanel.
// Fire-and-forget: failures are non-critical (panel falls back to neutral 0.5).
async function refreshVcSnapshot() {
  if (!state.sid) return;
  try {
    const r = await api.vc(state.sid);
    if (r.ok) {
      state.vcSnapshot = r.data;
    }
  } catch {
    /* non-critical */
  }
}

// Sprint 9 (Surface-DEAD #5) — refresh objective HUD bar.
// Fetch /api/session/:id/objective + render in #objective-bar. Fire-and-forget,
// HUD silenzia in caso di errore (best-effort surface, no crash session).
async function refreshObjectiveBar() {
  if (!state.sid) return;
  const containerEl = document.getElementById('objective-bar');
  if (!containerEl) return;
  try {
    const r = await api.objective(state.sid);
    if (r.ok && r.data) {
      renderObjectiveBar(containerEl, r.data);
    } else {
      renderObjectiveBar(containerEl, null);
    }
  } catch {
    /* non-critical */
  }
}

// Sprint 11 (Surface-DEAD #6) — refresh biome chip HUD.
// Reads state.world.biome_id (publicSessionView surface) e renderizza chip
// con icon + IT label. Hide gracefully se biome_id null. Fire-and-forget.
function refreshBiomeChip() {
  const containerEl = document.getElementById('biome-chip');
  if (!containerEl) return;
  const biomeId = state.world?.biome_id || null;
  // TKT-ECO-A5 — pass biome_modifiers per pressure tier indicator.
  const biomeModifiers = state.world?.biome_modifiers || null;
  renderBiomeChip(containerEl, biomeId, biomeModifiers);
}

// Action 7 (ADR-2026-04-28 §Action 7) — refresh CT bar HUD lookahead 3 turni.
// Reads state.world (publicSessionView units + active_unit + statuses) e
// renderizza strip top-HUD `current → next1 → next2 → next3`. Lookahead cap
// configurabile via window.__evoUiConfig.ct_bar_lookahead, default 3.
function refreshCtBar() {
  const containerEl = document.getElementById('ct-bar');
  if (!containerEl) return;
  const cap = Number(window.__evoUiConfig?.ct_bar_lookahead);
  const lookahead = Number.isFinite(cap) && cap >= 0 ? cap : 3;
  renderCtBar(containerEl, state.world || null, lookahead);
}

// Action 6 (ADR-2026-04-28 §Action 6) — refresh Ambition HUD strip.
// Long-arc campaign goal surface. Fetch active ambitions from backend +
// render pill HUD. On choice_ready=true → auto-open choice ritual modal
// (once per session per ambition, locked check reused).
async function refreshAmbitionHud() {
  const containerEl = document.getElementById('ambition-hud');
  if (!containerEl || !state.sid) return;
  let ambitions = [];
  try {
    const r = await api.ambitionsActive(state.sid);
    if (r && r.ok && Array.isArray(r.data?.ambitions)) {
      ambitions = r.data.ambitions;
    }
  } catch {
    /* network — graceful degrade, hide chip */
  }
  renderAmbitionHud(containerEl, ambitions);
  // Auto-trigger choice ritual modal on choice_ready (idempotent — locked check).
  for (const a of ambitions) {
    if (a.choice_ready && !isAmbitionChoiceLocked(a.ambition_id)) {
      openAmbitionChoicePanel(a, {
        onComplete: () => refreshAmbitionHud(),
      });
      break; // only one ritual modal at a time.
    }
  }
}

// Sprint β Visual UX 2026-04-28 — Frostpunk tension vignette (DOM overlay).
// Driver: state.world.pressure (0..100). CSS vars --tension-alpha + --tension-color
// applied to .tension-vignette singleton (created lazily). Pure helpers from
// render.js (tensionGaugeColor/tensionVignetteAlpha).
function applyTensionVignette(world) {
  if (!world || typeof document === 'undefined') return;
  let el = document.querySelector('.tension-vignette');
  if (!el) {
    el = document.createElement('div');
    el.className = 'tension-vignette';
    document.body.appendChild(el);
  }
  const pressure = Number(world.pressure || world.sistema_pressure || 0);
  // Lazy import via global (helpers re-exported from render.js bundle).
  // Fallback inline approximation se import non disponibile (test-safe).
  let alpha = 0;
  let color = '#a83232';
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const r = window.__evoRender || {};
    if (typeof r.tensionVignetteAlpha === 'function') alpha = r.tensionVignetteAlpha(pressure);
    if (typeof r.tensionGaugeColor === 'function') color = r.tensionGaugeColor(pressure);
  } catch {
    /* no-op */
  }
  if (alpha === 0) {
    const t = Math.max(0, Math.min(100, pressure)) / 100;
    alpha = Math.round(t * t * 0.4 * 1000) / 1000;
  }
  el.style.setProperty('--tension-alpha', String(alpha));
  el.style.setProperty('--tension-color', color);
}

// Sprint β Visual UX 2026-04-28 — Civ VI 3-tier tooltip controller.
// Hover delays: 300/800/1500ms. Stack on cell hover; dismiss onmove/onclick.
const TOOLTIP_STATE = { el: null, timers: [], hoverStartTs: 0, currentTier: 0 };
function ensureTooltipEl() {
  if (TOOLTIP_STATE.el) return TOOLTIP_STATE.el;
  if (typeof document === 'undefined') return null;
  const el = document.createElement('div');
  el.className = 'tooltip-tier';
  document.body.appendChild(el);
  TOOLTIP_STATE.el = el;
  return el;
}
function dismissTooltip() {
  TOOLTIP_STATE.timers.forEach((t) => clearTimeout(t));
  TOOLTIP_STATE.timers = [];
  TOOLTIP_STATE.currentTier = 0;
  if (TOOLTIP_STATE.el) TOOLTIP_STATE.el.classList.remove('visible');
}
window.__evoSpritBeta = { dismissTooltip, applyTensionVignette };

// 2026-04-27 PR-Y1 — Gris pressure palette body class apply.
// Driver: state.world.ai_progress.tier.name (Calm/Alert/Escalated/Critical/Apex)
// → body.pressure-{calm,alert,critical,apex}. Transition 1.5s in style.css.
function applyPressurePalette(world) {
  if (!world || typeof document === 'undefined') return;
  const tierName = world.ai_progress?.tier?.name || world.sistema_tier?.name || 'Calm';
  // Map 5 tier engine -> 4 palette buckets (Escalated + Critical share critical bucket).
  const map = {
    Calm: 'calm',
    Alert: 'alert',
    Escalated: 'critical',
    Critical: 'critical',
    Apex: 'apex',
  };
  const cls = `pressure-${map[tierName] || 'calm'}`;
  const body = document.body;
  if (!body) return;
  // Remove old pressure-* classes, add new
  for (const c of Array.from(body.classList)) {
    if (c.startsWith('pressure-')) body.classList.remove(c);
  }
  body.classList.add(cls);
}

async function refresh() {
  const r = await api.state(state.sid);
  if (r.ok) {
    const prev = state.world;
    state.world = r.data;
    processNewEvents(prev, state.world);
    refreshVcSnapshot();
    // Sprint 9 (Surface-DEAD #5): refresh objective HUD bar post-state-fetch.
    refreshObjectiveBar();
    // Sprint 11 (Surface-DEAD #6): refresh biome chip post-state-fetch.
    refreshBiomeChip();
    // Action 7 (ADR-2026-04-28 §Action 7): refresh CT bar lookahead 3 turni.
    refreshCtBar();
    // Action 6 (ADR-2026-04-28 §Action 6): refresh ambition HUD long-arc.
    refreshAmbitionHud();
    // 2026-04-27 PR-Y1 — Gris pressure palette apply post-state-fetch
    applyPressurePalette(state.world);
    // Sprint β Visual UX 2026-04-28 — Frostpunk tension vignette overlay.
    applyTensionVignette(state.world);
    if (state.selected) {
      const sel = state.world.units.find((u) => u.id === state.selected);
      if (!sel || sel.hp <= 0) state.selected = null;
    }
    redraw();
    // OD-001 Path A Sprint A — toggle Nido btn visibility quando state.world.nido_unlocked.
    // Hidden by default (display:none in index.html); inline override via JS.
    updateNestButtonVisibility(state.world?.nido_unlocked === true);
    // M11 Phase B — if host of a lobby, broadcast world snapshot to players.
    // Players render it as read-only spectator state. Payload kept small:
    // only fields players need to understand the board.
    if (lobbyBridge?.isHost && state.world) {
      lobbyBridge.publishWorld({
        session_id: state.sid,
        turn: state.world.turn,
        round: state.world.round,
        active_id: state.world.active_id,
        units: state.world.units,
        events: state.world.events,
        pressure: state.world.pressure,
        threatPreview: state.threatPreview,
      });
    }
    // Animation loop
    if (needsAnimFrame()) requestAnimationFrame(animTick);
  }
}

function animTick() {
  if (!state.world) return;
  redraw();
  if (needsAnimFrame()) requestAnimationFrame(animTick);
}

/**
 * M17 — Co-op host flow orchestration.
 * Returns:
 *   - null  → no co-op (solo host, no players). Proceed legacy.
 *   - 'wait' → coop run just started OR phase not ready; caller MUST stop.
 *   - { characters: [...] } → ready to start combat; caller pipes into api.start.
 */
async function maybeRunCoopHostFlow(scenarioId) {
  if (!lobbyBridge?.isHost) return null;
  const session = lobbyBridge.session;
  if (!session?.code || !session?.token) return null;
  // count players (exclude host)
  const players = Array.from(lobbyBridge._players?.values?.() || []).filter(
    (p) => p.role !== 'host' && p.id !== session.player_id,
  );
  if (players.length === 0) {
    // Solo host, no amici connessi: skip flow co-op (char creation + world
    // setup richiedono >=1 player). Fallback a combat legacy solo demo.
    appendLog(
      logEl,
      '⚠ Solo host: flow co-op skippato (serve 1+ amico). Avvio combat solo-demo legacy.',
      'warn',
    );
    updateHint('Co-op: invita 1+ amico via URL, poi ri-clicca Nuova sessione.');
    return null;
  }

  // Fetch current coop state
  let coopState = null;
  try {
    const r = await api.coopState(session.code);
    if (r.ok) coopState = r.data?.snapshot || null;
  } catch {
    // ignore — treat as lobby
  }
  const phase = coopState?.phase || 'lobby';

  if (phase === 'lobby' || phase === 'ended') {
    // Start run → auto transitions to character_creation.
    const r = await api.coopRunStart(session.code, session.token, [scenarioId]);
    if (!r.ok) {
      appendLog(logEl, `✖ coop run start: ${r.data?.error || r.status}`, 'error');
      return null;
    }
    appendLog(logEl, `🎭 Run co-op avviata — attendi PG dei ${players.length} player`);
    updateHint('Fase: creazione PG. Ricliccare "Nuova sessione" quando tutti pronti.');
    return 'wait';
  }

  if (phase === 'character_creation') {
    const readyCount = coopState?.characters?.length || 0;
    appendLog(logEl, `⏳ Attendi: ${readyCount}/${players.length} player hanno creato PG`, 'warn');
    return 'wait';
  }

  if (phase === 'world_setup') {
    // Confirm scenario + pipe characters into /session/start.
    const r = await api.coopWorldConfirm(session.code, session.token, scenarioId);
    if (!r.ok) {
      appendLog(logEl, `✖ coop world confirm: ${r.data?.error || r.status}`, 'error');
      return null;
    }
    appendLog(logEl, `✓ Scenario confermato, avvio combat con ${coopState.characters.length} PG`);
    return { characters: coopState.characters };
  }

  if (phase === 'combat') {
    appendLog(logEl, '⚠ Combat già in corso — usa Reset prima.', 'warn');
    return 'wait';
  }

  // debrief / other phases — defer M19
  appendLog(logEl, `Phase coop attuale: ${phase} (non gestita M17).`, 'warn');
  return null;
}

async function startNewSession() {
  state.endgameShown = false;
  state.pendingAbility = null;
  setAbilityTargetMode(false);
  const scenarioId = document.getElementById('scenario-select').value;
  appendLog(logEl, `→ carico scenario ${scenarioId}`);
  const sc = await api.scenario(scenarioId);
  if (!sc.ok) {
    appendLog(logEl, `✖ scenario load: ${sc.status}`, 'error');
    updateHint('Backend non raggiungibile? Verifica npm run start:api.');
    return;
  }

  // M17 — Co-op flow: if host of room with players, orchestrate coop phases.
  const coopCtx = await maybeRunCoopHostFlow(scenarioId);
  if (coopCtx === 'wait') return; // esc: wait for players to finish character creation
  const coopCharacters = coopCtx?.characters || null;
  const modSel = document.getElementById('modulation-select');
  // Se scenario raccomanda modulation (es. hardcore → 'full') e user non ha
  // scelto manualmente, applica recommended (aggiorna dropdown per UI clarity).
  if (sc.data.recommended_modulation && modSel && !modSel.value) {
    modSel.value = sc.data.recommended_modulation;
  }
  const modulation = modSel && modSel.value ? modSel.value : undefined;
  const startOpts = {
    sistema_pressure_start: sc.data.sistema_pressure_start || 0,
    hazard_tiles: sc.data.hazard_tiles || [],
  };
  if (modulation) startOpts.modulation = modulation;
  // M7-#2 Phase C: pipe encounter_class da scenario a backend per apply
  // damage_curves.yaml multiplier + enrage threshold.
  if (sc.data.encounter_class) startOpts.encounter_class = sc.data.encounter_class;
  // Sprint 9 (Surface-DEAD #5): pipe encounter_id so backend loads encounter
  // YAML (docs/planning/encounters/<id>.yaml) which contains objective config.
  // Sblocca HUD top-bar live (#objective-bar). Backward compat: backend ignora
  // se encounter_id non risolve un YAML.
  if (sc.data.id) startOpts.encounter_id = sc.data.id;
  if (coopCharacters && coopCharacters.length > 0) {
    startOpts.characters = coopCharacters;
  }
  const st = await api.start(sc.data.units, startOpts);
  if (!st.ok) {
    appendLog(logEl, `✖ session start: ${st.status}`, 'error');
    return;
  }
  state.sid = st.data.session_id;
  state.world = st.data.state;
  state.selected = null;
  state.target = null;
  // Sprint 8: nuova sessione → invalidate predict cache (stale tuple keys).
  clearPredictionCache();
  // Sprint 9 (Surface-DEAD #5): refresh HUD obiettivo subito su nuova sessione.
  refreshObjectiveBar();
  // Sprint 11 (Surface-DEAD #6): refresh biome chip subito su nuova sessione.
  refreshBiomeChip();
  // Action 7 (ADR-2026-04-28 §Action 7): refresh CT bar subito su nuova sessione.
  refreshCtBar();
  // Action 6 (ADR-2026-04-28 §Action 6): seed ambition + refresh HUD subito.
  // Default seed `skiv_pulverator_alliance` per Skiv long-arc demo. Idempotent.
  api.ambitionSeed(state.sid, 'skiv_pulverator_alliance').catch(() => {
    /* graceful degrade — HUD hidden if seed fails */
  });
  refreshAmbitionHud();
  // Bundle B.3 — pipe session_id to codex panel for /api/v1/codex/pages.
  setCodexSessionId(state.sid);
  // M11 Phase B+ (TKT-M11B-03) — if host room carries campaign_id, bootstrap
  // campaign runtime and cache summary so publishWorld mirrors it to players.
  // V1 Onboarding Phase B (2026-04-26): if campaign def carries `onboarding`
  // section AND no trait choice persisted for this session, open identity
  // picker overlay pre-tutorial. User picks (or auto-timeout default) → pass
  // initial_trait_choice to /start. Scoped: host only (first session).
  // Sprint 3 §I (2026-04-27) — pipe campaign_id to codex panel for glyph progression tab.
  if (lobbyBridge?.session?.campaign_id) {
    setCodexCampaignId(lobbyBridge.session.campaign_id);
  }
  if (lobbyBridge?.isHost && lobbyBridge.session.campaign_id) {
    try {
      let initialTraitChoice = null;
      // Peek campaign def onboarding via cheap summary (no creation yet).
      const probe = await api.campaignStart(
        lobbyBridge.session.player_id,
        lobbyBridge.session.campaign_id,
      );
      if (probe.ok && probe.data?.campaign_def?.onboarding && !window.__onboardingPicked) {
        const onboarding = probe.data.campaign_def.onboarding;
        try {
          const { openOnboardingPanel } = await import('./onboardingPanel.js');
          // Load CSS once
          if (!document.getElementById('onboardingPanelCss')) {
            const link = document.createElement('link');
            link.id = 'onboardingPanelCss';
            link.rel = 'stylesheet';
            link.href = new URL('./onboardingPanel.css', import.meta.url).href;
            document.head.appendChild(link);
          }
          initialTraitChoice = await openOnboardingPanel({ onboarding });
          window.__onboardingPicked = initialTraitChoice;
          appendLog(logEl, `🎭 Scelta identità: ${initialTraitChoice}`);
        } catch (pickErr) {
          appendLog(logEl, `⚠ onboarding skip: ${pickErr?.message || pickErr}`, 'warn');
        }
      }
      const campRes = initialTraitChoice
        ? await api.campaignStart(
            lobbyBridge.session.player_id,
            lobbyBridge.session.campaign_id,
            initialTraitChoice,
          )
        : probe;
      if (campRes.ok) {
        const summary = campRes.data?.campaign || campRes.data || null;
        lobbyBridge.setCampaignSummary(summary);
        appendLog(
          logEl,
          `🗺 Campagna ${summary?.id || lobbyBridge.session.campaign_id} avviata (live-mirror ON)`,
        );
      } else {
        appendLog(logEl, `✖ campagna bootstrap: ${campRes.data?.error || campRes.status}`, 'error');
      }
    } catch (err) {
      appendLog(logEl, `✖ campagna bootstrap: ${err?.message || err}`, 'error');
    }
  }
  // M4 A.1+A.2: reset flag state per nuova sessione
  state.roundInit = false;
  _pendingConfirm = null;
  // W4 — reset round tracking
  state.pendingIntents = [];
  state.lastResolutionOrder.clear();
  stopPlanningTimer();
  // W5.D — reset eval set per session
  state.evalSet = [];
  lastEventsCount = (state.world?.events || []).length;
  appendLog(logEl, `✓ sessione ${state.sid.slice(0, 8)}…`);
  const flags = [];
  if (useRoundFlow()) flags.push('round=simultaneous');
  if (useConfirmAction()) flags.push('confirm=on');
  const hintFlags = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
  // W8-emergency (bug #1+#8): auto-select first alive player so ability panel
  // populates immediately + user discovers flow. Previously user had to click
  // a unit to see the Abilities sidebar — undiscoverable affordance.
  const firstPlayer = getUnits(state.world).find((u) => u.controlled_by === 'player' && u.hp > 0);
  if (firstPlayer) {
    state.selected = firstPlayer.id;
    sfx.select();
    updateHint(
      `Sessione iniziata${hintFlags}. ${firstPlayer.id} selezionato → abilità a destra (click ⚔) · click cella=move · click nemico=attack.`,
    );
  } else {
    updateHint(`Sessione iniziata${hintFlags}. Seleziona una tua unità.`);
  }
  redraw();
}

// W7.D — re-render quando abilities fetched per popolare chips per-unit.
unitsUl.addEventListener('abilities-ready', () => {
  if (state.world) redraw();
});

document.getElementById('cancel-pending').addEventListener('click', () => cancelPendingAbility());
document.getElementById('new-session').addEventListener('click', () => {
  cancelPendingAbility(true);
  startNewSession();
});
document.getElementById('reset-round')?.addEventListener('click', async () => {
  await emergencyResetRound();
});
// Bundle B.2 — Undo last action button (planning phase only, Ctrl+Z mirror).
document.getElementById('undo-action')?.addEventListener('click', () => handleUndoAction());
// TKT-P6-FE — Rewind safety valve button (3-snapshot buffer, post-action).
document.getElementById('rewind-action')?.addEventListener('click', () => handleRewindAction());
// W8L — Codex btn header (in-game wiki: Tips re-read + Glossario + Abilità + Status).
document.getElementById('codex-open')?.addEventListener('click', () => {
  toggleCodex();
});
// W8k / W8k2 — timer toggle header btn. DEFAULT OFF (user feedback).
// User clicca per opt-in ON.
document.getElementById('timer-toggle')?.addEventListener('click', (ev) => {
  const btn = ev.currentTarget;
  const wasOn = getLocalStorageFlag('evo:planning-timer', 'on');
  try {
    localStorage.setItem('evo:planning-timer', wasOn ? 'off' : 'on');
  } catch {
    /* ignore */
  }
  const nowOn = !wasOn;
  btn.style.opacity = nowOn ? '1' : '0.4';
  btn.title = `Planning timer ${nowOn ? 'ON' : 'OFF'} (click per toggle)`;
  if (!nowOn) stopPlanningTimer();
  appendLog(logEl, `⏱ Timer planning ${nowOn ? 'ON' : 'OFF'}`);
});
// Init button state on load — default OFF (dimmed).
(() => {
  const btn = document.getElementById('timer-toggle');
  if (!btn) return;
  const on = getLocalStorageFlag('evo:planning-timer', 'on');
  btn.style.opacity = on ? '1' : '0.4';
  btn.title = `Planning timer ${on ? 'ON' : 'OFF'} (click per toggle)`;
})();
document.getElementById('download-eval').addEventListener('click', () => {
  downloadEvalSet();
});
document.getElementById('open-replay').addEventListener('click', () => {
  cancelPendingAbility(true);
  if (!state.sid) {
    alert('Nessuna sessione attiva.');
    return;
  }
  openReplay(state.sid);
});
function normalizePos(pos) {
  if (!pos) return null;
  if (Array.isArray(pos)) return { x: Number(pos[0]) || 0, y: Number(pos[1]) || 0 };
  return { x: Number(pos.x) || 0, y: Number(pos.y) || 0 };
}

function processIaActions(iaActions) {
  if (!Array.isArray(iaActions)) return;
  let delay = 0;
  for (const a of iaActions) {
    const type = a.type || a.action_type;
    const actorId = a.unit_id || a.actor_id;
    const from = normalizePos(a.position_from);
    const to = normalizePos(a.position_to);
    const targetId = a.target || a.target_id;
    const dmg = a.damage_dealt ?? a.damage ?? 0;

    setTimeout(() => {
      if (type === 'move' && from && to) {
        recordMove(actorId, from, to);
        sfx.sis_turn();
      } else if (type === 'attack' || type === 'ability') {
        // W8c — Refactor A: handleDamageEvent centralizza ray+popup+flash+SFX.
        const target = getUnits(state.world).find((u) => u.id === targetId);
        const actor = getUnits(state.world).find((u) => u.id === actorId);
        handleDamageEvent({ actor, target, damage: dmg, targetId, result: a.result });
      }
      const actorLabel = (() => {
        const a = getUnits(state.world).find((u) => u.id === actorId);
        return a?.controlled_by === 'sistema' ? 'SIS' : 'PG';
      })();
      appendLog(
        logEl,
        `${actorLabel} · ${actorId}: ${type}${targetId ? ` → ${targetId}` : ''}${dmg ? ` (${dmg})` : ''}`,
        'event',
      );
      if (needsAnimFrame()) requestAnimationFrame(animTick);
    }, delay);
    delay += ACTION_ANIM_STAGGER_MS; // W8b: stagger via shared constant
  }
}

// W4 — commit-round factored out so auto-commit (W4.5) e end-turn button
// possono condividere la stessa logica + reveal overlay + priority badge.
// W7.A — Emergency reset state (usato da error handler o user "Reset" button).
// Clear tutti flag round + overlay + re-fetch state server per recover da block.
async function emergencyResetRound() {
  state.roundInit = false;
  state.pendingIntents = [];
  state.lastResolutionOrder.clear();
  _pendingConfirm = null;
  stopPlanningTimer();
  const overlay = document.getElementById('commit-reveal');
  if (overlay) {
    overlay.classList.add('fade-out');
    overlay.classList.remove('visible');
  }
  if (state.sid) {
    try {
      const r = await api.state(state.sid);
      if (r.ok) {
        state.world = r.data;
        redraw();
      }
    } catch {
      /* ignore */
    }
  }
  updateHint(`🔄 Reset stato round. Pianifica di nuovo.`);
}
window.__dbg = window.__dbg || {};
window.__dbg.emergencyResetRound = emergencyResetRound;

async function triggerCommitRound() {
  if (!state.sid) return;
  sfx.turn_end();
  appendLog(logEl, '→ risolvo round');
  stopPlanningTimer();
  // W8h — Onboarding tip first time round resolve.
  showTip('round-resolve');

  try {
    if (!state.roundInit) {
      let bp = await api.beginPlanning(state.sid);
      if (bp.networkError) {
        appendLog(logEl, `… rete interrotta, ritento begin-planning`, 'warn');
        await new Promise((res) => setTimeout(res, 400));
        bp = await api.beginPlanning(state.sid);
      }
      if (!bp.ok) {
        const msg = bp.networkError
          ? `rete persa (verifica backend :3334)`
          : bp.data?.error || bp.status;
        appendLog(logEl, `✖ begin-planning: ${msg}`, 'error');
        updateHint(`✖ Begin-planning fallito: ${msg}`);
        await emergencyResetRound();
        return;
      }
      state.roundInit = true;
      // M8 Plan-Reveal P0: store threat_preview
      state.threatPreview = Array.isArray(bp.data?.threat_preview) ? bp.data.threat_preview : [];
    }
    let r = await api.commitRound(state.sid, true);
    // W8-emergency (bug #5): transient network drop — auto-retry once after 400ms.
    if (r.networkError) {
      appendLog(logEl, `… rete interrotta, ritento commit-round`, 'warn');
      await new Promise((res) => setTimeout(res, 400));
      r = await api.commitRound(state.sid, true);
    }
    if (!r.ok) {
      const msg = r.networkError
        ? `rete persa (verifica backend :3334)`
        : r.data?.error || r.status;
      appendLog(logEl, `✖ commit-round: ${msg}`, 'error');
      updateHint(`✖ Commit-round fallito: ${msg}. Usa "🔄 Reset" per ripartire.`);
      await emergencyResetRound();
      return;
    }
    state.roundInit = false;
    _pendingConfirm = null;
    state.pendingIntents = [];
    // M13 P6 Phase B — mission timer HUD update + state cache.
    if (r.data?.mission_timer?.enabled) {
      state.lastMissionTimer = r.data.mission_timer;
      updateMissionTimerHud(r.data.mission_timer);
    }
    // M8 Plan-Reveal P0: clear threat preview post-resolve (intents consumed).
    // Fix Codex review #1658: legacy branch reset era dead code su useRoundFlow()=true
    // → stale SIS intents mostrati post-resolve. Reset qui è l'active path.
    state.threatPreview = [];

    const playerActions = r.data?.player_actions || [];
    const iaActions = r.data?.ia_actions || [];
    const resolutionQueue = r.data?.resolution_queue || [];
    const allActions = [...playerActions, ...iaActions];

    // W4.3 — build resolution order map: unit_id → rank (1-based).
    // Preferisci resolution_queue (server-computed priority), fallback ordine allActions.
    state.lastResolutionOrder.clear();
    const queueItems = resolutionQueue.length > 0 ? resolutionQueue : allActions;
    queueItems.forEach((item, idx) => {
      const uid = item.unit_id || item.actor_id;
      if (uid && !state.lastResolutionOrder.has(uid)) {
        state.lastResolutionOrder.set(uid, idx + 1);
      }
    });

    // W4.2 — commit reveal overlay pre-animations.
    // W8b: constants from anim.js (COMMIT_REVEAL_MS, ACTION_ANIM_STAGGER_MS).
    const turnNum = (state.world?.turn || 0) + 1;
    showCommitReveal(turnNum, allActions.length);

    setTimeout(() => {
      if (allActions.length > 0) processIaActions(allActions);
    }, COMMIT_REVEAL_MS);

    const totalDelay = COMMIT_REVEAL_MS + allActions.length * ACTION_ANIM_STAGGER_MS + 200;
    setTimeout(async () => {
      try {
        await refresh();
        state.lastResolutionOrder.clear();
        redraw();
        appendLog(
          logEl,
          `✓ round ${state.world?.turn || '?'} risolto (${allActions.length} azioni)`,
        );
        // M16 P0-2 — co-op Jackbox flow: host notifica clear round intents
        // post-resolve. Reset pending map server-side + avanza roundIndex +
        // broadcast round_ready con phase=planning ai player.
        if (
          lobbyBridge?.isHost &&
          lobbyBridge?.client &&
          typeof lobbyBridge.client.sendRoundClear === 'function'
        ) {
          try {
            lobbyBridge.client.sendRoundClear();
          } catch (e) {
            // non-blocking — legacy flow OK se WS down
            if (typeof console !== 'undefined') console.warn('[main] sendRoundClear', e);
          }
        }
      } catch (err) {
        appendLog(logEl, `✖ refresh dopo round: ${err?.message || err}`, 'error');
        await emergencyResetRound();
      }
    }, totalDelay);
  } catch (err) {
    appendLog(logEl, `✖ commit-round exception: ${err?.message || err}`, 'error');
    await emergencyResetRound();
  }
}

// M13 P6 Phase B — mission timer HUD.
// Bottom-right overlay con countdown. Red pulse quando remaining ≤ warning_at.
function updateMissionTimerHud(timer) {
  if (!timer || !timer.enabled) {
    const el = document.getElementById('mission-timer-hud');
    if (el) el.classList.add('hidden');
    return;
  }
  let el = document.getElementById('mission-timer-hud');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mission-timer-hud';
    el.innerHTML = `
      <div class="mt-icon">⏱</div>
      <div class="mt-body">
        <div class="mt-count"><span id="mt-remaining">—</span>/<span id="mt-limit">—</span></div>
        <div class="mt-label">rounds</div>
      </div>
    `;
    document.body.appendChild(el);
  }
  el.classList.remove('hidden');
  const remaining = Number(timer.remaining_turns ?? 0);
  const limit = Number(timer.turn_limit ?? 0);
  const remEl = document.getElementById('mt-remaining');
  const limEl = document.getElementById('mt-limit');
  if (remEl) remEl.textContent = String(remaining);
  if (limEl) limEl.textContent = String(limit);
  el.classList.toggle('mt-warning', timer.warning === true || remaining <= 3);
  el.classList.toggle('mt-expired', timer.expired === true);
  if (timer.warning) {
    appendLog(logEl, `⏱ Timer warning: ${remaining} rounds rimasti`, 'warn');
  }
  if (timer.expired) {
    appendLog(
      logEl,
      `⏱ Timer expired → ${timer.action || 'defeat'}${timer.side_effects?.pressure_delta ? ' (+' + timer.side_effects.pressure_delta + ' pressure)' : ''}`,
      'error',
    );
  }
}
window.__dbg = window.__dbg || {};
window.__dbg.updateMissionTimerHud = updateMissionTimerHud;

// W4.2 — Commit reveal overlay: "⚔ ROUND N · X azioni simultanee" flash 700ms.
function showCommitReveal(turnNum, actionCount) {
  let overlay = document.getElementById('commit-reveal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'commit-reveal';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<div class="cr-inner"><div class="cr-title">⚔ ROUND ${turnNum}</div><div class="cr-sub">${actionCount} azione${actionCount === 1 ? '' : 'i'} simultanea${actionCount === 1 ? '' : 'e'}</div></div>`;
  overlay.classList.remove('fade-out');
  overlay.classList.add('visible');
  setTimeout(() => {
    overlay.classList.add('fade-out');
    overlay.classList.remove('visible');
  }, 650);
}

// W4.6 / W8k / W8k2 — Planning timer: 30s countdown, auto-commit on expiry.
// W8k2 (user feedback run5): DEFAULT OFF. User opts-in via header btn ⏱
// (localStorage flag `evo:planning-timer=on`). Prima era default ON fastidioso.
function startPlanningTimer() {
  stopPlanningTimer();
  // W8k2 — skip timer unless flag explicit 'on'.
  if (!getLocalStorageFlag('evo:planning-timer', 'on')) {
    return;
  }
  state.planningTimerStart = performance.now();
  const el = getPlanningTimerEl();
  el.classList.remove('hidden');
  planningTimerHandle = setInterval(() => {
    if (state.planningTimerStart == null) return;
    const elapsed = performance.now() - state.planningTimerStart;
    const remaining = Math.max(0, PLANNING_TIMER_MS - elapsed);
    updatePlanningTimerUI(remaining);
    if (remaining <= 0) {
      appendLog(logEl, `⏱ Timer scaduto — auto-commit`);
      stopPlanningTimer();
      triggerCommitRound();
    }
  }, 100);
}

function stopPlanningTimer() {
  if (planningTimerHandle) clearInterval(planningTimerHandle);
  planningTimerHandle = null;
  state.planningTimerStart = null;
  const el = document.getElementById('planning-timer');
  if (el) el.classList.add('hidden');
}

function getPlanningTimerEl() {
  let el = document.getElementById('planning-timer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'planning-timer';
    el.className = 'hidden';
    el.innerHTML = `<span class="pt-label">Planning</span><div class="pt-bar"><div class="pt-fill"></div></div><span class="pt-value">30</span>`;
    const status = document.querySelector('header .status') || document.querySelector('header');
    if (status) status.appendChild(el);
  }
  return el;
}

function updatePlanningTimerUI(remainingMs) {
  const el = document.getElementById('planning-timer');
  if (!el) return;
  const secs = Math.ceil(remainingMs / 1000);
  const ratio = remainingMs / PLANNING_TIMER_MS;
  el.querySelector('.pt-value').textContent = String(secs);
  const fill = el.querySelector('.pt-fill');
  fill.style.width = `${(ratio * 100).toFixed(1)}%`;
  fill.style.background = ratio < 0.2 ? '#f44336' : ratio < 0.5 ? '#ffc107' : '#4caf50';
}

document.getElementById('end-turn').addEventListener('click', async () => {
  if (!state.sid) return;
  if (useRoundFlow()) {
    await triggerCommitRound();
    return;
  }
  // Legacy flow (default off): immediate end-turn
  sfx.turn_end();
  appendLog(logEl, '→ fine turno');

  // M4 A.1 — Round model simultaneous: commit-round auto_resolve
  if (useRoundFlow()) {
    // Ensure begin-planning called almeno una volta (first turn may skip if no declare)
    if (!state.roundInit) {
      const bp = await api.beginPlanning(state.sid);
      if (!bp.ok) {
        appendLog(logEl, `✖ begin-planning: ${bp.data?.error || bp.status}`, 'error');
        return;
      }
      state.roundInit = true;
      // M8 Plan-Reveal P0: store threat_preview (empty array se no intents)
      state.threatPreview = Array.isArray(bp.data?.threat_preview) ? bp.data.threat_preview : [];
    }
    const r = await api.commitRound(state.sid, true);
    if (!r.ok) {
      appendLog(logEl, `✖ commit-round: ${r.data?.error || r.status}`, 'error');
      return;
    }
    // Reset roundInit per prossimo turno
    state.roundInit = false;
    // M8 Plan-Reveal P0: clear threat preview post-resolve (intents consumed)
    state.threatPreview = [];
    _pendingConfirm = null;
    // Process resolution_queue as animations (shape differs da ia_actions)
    const queue = r.data?.resolution_queue || [];
    if (queue.length > 0) {
      // Animazioni stagger per ogni action risolta
      queue.forEach((action, i) => {
        setTimeout(() => {
          // Popup only, actual state refresh post-all
        }, i * 200);
      });
    }
    setTimeout(
      async () => {
        await refresh();
        appendLog(logEl, `✓ round ${state.world?.turn || '?'} risolto (${queue.length} azioni)`);
      },
      queue.length * 200 + 300,
    );
    return;
  }

  // Legacy flow (default)
  const r = await api.endTurn(state.sid);
  if (!r.ok) {
    appendLog(logEl, `✖ end turn: ${r.status}`, 'error');
    return;
  }
  if (r.data?.ia_actions) processIaActions(r.data.ia_actions);
  const totalDelay = Array.isArray(r.data?.ia_actions)
    ? r.data.ia_actions.length * ACTION_ANIM_STAGGER_MS + 200
    : 200;
  setTimeout(async () => {
    await refresh();
    appendLog(logEl, '✓ turno giocatore pronto');
  }, totalDelay);
});

// Mute toggle
const muteBtn = document.getElementById('toggle-mute');
muteBtn.addEventListener('click', () => {
  setMuted(!isMuted());
  muteBtn.textContent = isMuted() ? '🔇' : '🔊';
  muteBtn.title = isMuted() ? 'Unmute SFX' : 'Mute SFX';
});

// Popola modulation picker da /api/party/modulations (PR 3 co-op scaling).
// Fallback silenzioso se backend < ADR-2026-04-17 o endpoint non risponde.
async function loadModulations() {
  const modSel = document.getElementById('modulation-select');
  if (!modSel) return;
  const res = await api.modulations();
  if (!res.ok || !Array.isArray(res.data?.modulations)) return;
  const current = modSel.value;
  // Mantieni option "auto" come primo, aggiungi preset
  for (const m of res.data.modulations) {
    const opt = document.createElement('option');
    opt.value = m.id;
    const pgTotal = Array.isArray(m.pg_per_player)
      ? m.pg_per_player.reduce((a, b) => a + b, 0)
      : m.deployed;
    opt.textContent = `${m.id} · ${m.players}p × ${pgTotal / m.players}PG = ${m.deployed} schierati`;
    opt.title = m.description || '';
    modSel.appendChild(opt);
  }
  modSel.value = current;
  // Riavvia sessione se user cambia modulation (default: auto → 6x6)
  modSel.addEventListener('change', () => startNewSession());
}

// M4 P0 W2 — Help panel (? key, top-right button, auto-open prima sessione)
initHelpPanel('help-open');
// M7 feedback panel — playtest collection
initFeedbackPanel({ getSessionId: () => state.sid });
// M10 Phase D — campaign panel (ADR-2026-04-21)
initCampaignPanel();
// M12 Phase C+D — forms evolution panel (ADR-2026-04-23-m12-phase-a).
// Phase D: live VC snapshot pipe (state.vcSnapshot) + evolve animation callback.
initFormsPanel({
  getSessionId: () => state.sid,
  getSelectedUnit: () =>
    state.world && state.selected
      ? getUnits(state.world).find((u) => u.id === state.selected) || null
      : null,
  getVcSnapshot: () => {
    const selUid = state.selected;
    const perActor = state.vcSnapshot?.per_actor || {};
    const actorVc = selUid ? perActor[selUid] : null;
    const mbti = actorVc?.mbti_axes;
    return {
      round: state.world?.round ?? state.world?.turn ?? 0,
      turn: state.world?.turn ?? 0,
      mbti_axes:
        mbti && Object.keys(mbti).length > 0
          ? mbti
          : {
              E_I: { value: 0.5 },
              S_N: { value: 0.5 },
              T_F: { value: 0.5 },
              J_P: { value: 0.5 },
            },
      mbti_type: actorVc?.mbti_type || null,
    };
  },
  onEvolveSuccess: ({ unitId, delta }) => {
    const unit = state.world ? getUnits(state.world).find((u) => u.id === unitId) : null;
    if (unit?.position) {
      pushPopup(unit.position.x, unit.position.y, `🧬 ${delta.new_form_id}`, '#66d1fb');
    }
    flashUnit(unitId, '#66d1fb');
    sfx.select();
    appendLog(
      logEl,
      `🧬 ${unitId} → ${delta.new_form_id} (${delta.label}) · PE ${delta.pe_before}→${delta.pe_after}`,
    );
  },
});

// M13 P3 Phase B — progression panel (perk pick overlay).
initProgressionPanel({
  getSessionId: () => state.sid,
  getSelectedUnit: () =>
    state.world && state.selected
      ? getUnits(state.world).find((u) => u.id === state.selected) || null
      : null,
  getCampaignId: () => {
    try {
      return localStorage.getItem('evoTacticsCampaignId') || null;
    } catch {
      return null;
    }
  },
  onPickSuccess: ({ unitId, perk }) => {
    appendLog(logEl, `📈 ${unitId} → perk ${perk?.id || '?'}`);
  },
});

// M11 Phase B — lobby bridge (Jackbox room-code WS). Null if no session stored.
// Host role: publishes world state to players after each /session/state refresh.
// Player role: renders read-only spectator overlay and skips local session auto-start.
const lobbyBridge = initLobbyBridgeIfPresent();

// M11 Phase B+ (TKT-M11B-02) — host bridges player WS intents to backend's
// declare-intent endpoint so that phone-submitted intents participate in the
// round alongside host-declared ones.
if (lobbyBridge?.isHost) {
  lobbyBridge.onPlayerIntent(async (intent) => {
    if (!state.sid) {
      appendLog(logEl, `⚠ intent ricevuto da ${intent.from_player_id} ma sessione non avviata`);
      return;
    }
    if (!intent.actor_id || !intent.action) {
      appendLog(logEl, `⚠ intent malformato da ${intent.from_player_id}`);
      return;
    }
    // Lazy-init round planning if first intent arrives before host's own.
    if (!state.roundInit) {
      const bp = await api.beginPlanning(state.sid);
      if (bp.ok) {
        state.roundInit = true;
        state.threatPreview = Array.isArray(bp.data?.threat_preview) ? bp.data.threat_preview : [];
      }
    }
    const r = await api.declareIntent(state.sid, intent.actor_id, intent.action);
    const tag = `${intent.action.type}${intent.action.target_id ? ` → ${intent.action.target_id}` : ''}`;
    if (r.ok) {
      appendLog(
        logEl,
        `📱→🧠 ${String(intent.from_player_id || '?').slice(0, 8)}: ${intent.actor_id} ${tag}`,
      );
      state.pendingIntents.push({
        unit_id: intent.actor_id,
        action: intent.action,
        ts: intent.ts || Date.now(),
        from_lobby: intent.from_player_id,
      });
      redraw();
    } else {
      appendLog(logEl, `✖ intent relay (${intent.actor_id} ${tag}): ${r.data?.error || r.status}`);
    }
  });
}

if (lobbyBridge) {
  lobbyBridge.connect();
}

// W8O — Resize listener: redraw canvas quando viewport cambia (CELL dinamico).
let _resizeTimeout = null;
window.addEventListener('resize', () => {
  if (_resizeTimeout) clearTimeout(_resizeTimeout);
  _resizeTimeout = setTimeout(() => {
    if (state.world) redraw();
  }, 120);
});

// 2026-04-28 Sprint F — Asset onload listener. Trigger redraw quando tile/sprite
// PNG terminano load (resolveTileImg / resolveCreatureSprite). Senza redraw, primo
// paint usa cache vuota → fallback shape, sprite mai visibile.
window.addEventListener('evo:asset-loaded', () => {
  if (state.world) redraw();
});

// M4 P0 W2 — Fullscreen toggle
const fsBtn = document.getElementById('fullscreen-toggle');
if (fsBtn) {
  fsBtn.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        fsBtn.textContent = '⛶⃞';
        fsBtn.title = 'Esci da schermo intero';
      } else {
        await document.exitFullscreen();
        fsBtn.textContent = '⛶';
        fsBtn.title = 'Schermo intero';
      }
    } catch (e) {
      appendLog(logEl, `✖ fullscreen: ${e.message}`, 'error');
    }
  });
  document.addEventListener('fullscreenchange', () => {
    fsBtn.textContent = document.fullscreenElement ? '⛶⃞' : '⛶';
  });
}

// M11 Phase B — bootstrap gate:
//   - No lobby session: local game auto-start (legacy path).
//   - Host: auto-start local game; refresh() broadcasts world to players.
//   - Player: skip auto-start; spectator overlay renders host state via WS.
if (lobbyBridge?.isPlayer) {
  // Spectator mode — do not create a local session. UI is handled by lobbyBridge overlay.
  loadModulations();
} else {
  loadModulations().then(() => startNewSession());
}
// M12 Phase D — campaign advance helper with evolve auto-open.
// Wraps api.campaignAdvance; if backend returns evolve_opportunity=true, opens
// the forms panel after the encounter outcome is recorded. Consumed by campaign
// flow triggers (manual user action, harness, host-bridge mirror).
async function advanceCampaignWithEvolvePrompt(campaignId, outcome, peEarned = 0, piEarned = 0) {
  // M13 P6 Phase B — auto-timeout: se mission timer è scaduto quando advance
  // viene chiamato senza outcome esplicito (o con 'victory' prematuro), forza
  // 'timeout' per gating corretto campaign retry.
  let resolvedOutcome = outcome;
  const timer = state.lastMissionTimer;
  if (timer?.expired && outcome !== 'defeat') {
    if (!outcome || outcome === 'victory') {
      appendLog(
        logEl,
        `⏱ Auto-timeout: mission_timer expired → outcome='timeout' (era '${outcome || 'none'}')`,
      );
      resolvedOutcome = 'timeout';
    }
  }
  // Collect survivors for XP grant (M13 P3 Phase B).
  // Sprint Spore Moderate (PR #1916) — survivors include `mp` field for MP
  // accrual server-side. Default mp=5 se unit non lo espone (back-compat).
  const survivors = state.world
    ? getUnits(state.world)
        .filter((u) => u.controlled_by === 'player' && Number(u.hp) > 0)
        .map((u) => ({
          id: u.id,
          job: u.job,
          hp: u.hp,
          controlled_by: u.controlled_by,
          mp: Number(u.mp ?? 5),
        }))
    : [];
  // Sprint Spore Moderate §S3 — encounter_meta per MP accrual.
  // tier: derive da sistema_tier (Calm/Alert=1, Escalated/Critical=2, Apex=3).
  // kill_with_status: true se almeno 1 enemy KO'd con status attivo nel round corrente
  //   (best-effort heuristic; backend valida).
  // biome_match: stub false per ora (richiede biome metadata wire futura).
  const tierName =
    state.world?.ai_progress?.tier?.name || state.world?.sistema_tier?.name || 'Calm';
  const tierMap = { Calm: 1, Alert: 1, Escalated: 2, Critical: 2, Apex: 3 };
  const enemyCorpses = state.world
    ? getUnits(state.world).filter(
        (u) =>
          u.controlled_by !== 'player' &&
          Number(u.hp) <= 0 &&
          Array.isArray(u.status) &&
          u.status.length > 0,
      )
    : [];
  const encounter_meta = {
    tier: tierMap[tierName] || 1,
    kill_with_status: enemyCorpses.length > 0,
    biome_match: false,
  };
  const extra = survivors.length > 0 ? { survivors, encounter_meta } : { encounter_meta };
  const res = await api.campaignAdvance(campaignId, resolvedOutcome, peEarned, piEarned, extra);
  const data = res.data || {};
  if (res.ok && data.evolve_opportunity) {
    appendLog(
      logEl,
      `🧬 Evolve opportunity unlocked (+${data.evolve_pe_earned} PE ≥ ${data.evolve_pe_threshold})`,
    );
    openFormsPanel();
  }
  // Auto-open progression panel if any survivor leveled up → pending perk pick.
  const grants = Array.isArray(data.xp_grants) ? data.xp_grants : [];
  const leveled = grants.find((g) => g.leveled_up);
  if (leveled) {
    appendLog(logEl, `📈 ${leveled.unit_id} level ${leveled.level_before}→${leveled.level_after}`);
    // Select the leveled unit and open panel.
    if (state.world) {
      const target = getUnits(state.world).find((u) => u.id === leveled.unit_id);
      if (target) state.selected = target.id;
    }
    setTimeout(() => openProgressionPanel(), 200);
  }
  // Sprint Spore Moderate §S3 — MP grants toast (Gate 5 DoD: engine wired UX).
  // Pattern parallelo a xp_grants: 1 log line per survivor con earned > 0,
  // facoltativo flashUnit + pushPopup quando world units presenti.
  const mpGrants = Array.isArray(data.mp_grants) ? data.mp_grants : [];
  for (const grant of mpGrants) {
    if (!grant || !(grant.earned > 0)) continue;
    const sources = Array.isArray(grant.sources) ? grant.sources.join(', ') : '';
    appendLog(
      logEl,
      `🧬 ${grant.unit_id || '?'} +${grant.earned} MP (now ${grant.new_pool}/30)${sources ? ' [' + sources + ']' : ''}`,
    );
    // Floating popup sopra unit selezionata se presente.
    if (state.world && grant.unit_id) {
      const target = getUnits(state.world).find((u) => u.id === grant.unit_id);
      if (target?.position) {
        try {
          pushPopup(target.position.x, target.position.y, `+${grant.earned} MP`, '#a78bfa');
        } catch {
          /* popup is best-effort */
        }
      }
    }
  }
  return res;
}

// P4 Thought Cabinet — header btn 🧠 + overlay.
initThoughtsPanel({
  getSessionId: () => state.sid,
  getSelectedUnit: () =>
    state.world && state.selected
      ? getUnits(state.world).find((u) => u.id === state.selected) || null
      : null,
});

// Skiv Goal 3 — Thoughts ritual choice UI (P4 agency, Disco extension).
// Auto-open trigger: window event 'research_completed' with detail
// { unit_id, internalized_count } fired when the 3rd thought completes
// internalization (apex gate moment). Manual debug via __evo.openRitualPanel.
initThoughtsRitualPanel({
  getSessionId: () => state.sid,
  getSelectedUnit: () =>
    state.world && state.selected
      ? getUnits(state.world).find((u) => u.id === state.selected) || null
      : null,
});

// Action 6 (ADR-2026-04-28 §Action 6) — Ambition choice ritual panel.
// Triggered automatically by refreshAmbitionHud when choice_ready=true.
// bond_hearts read from state.world.bond_hearts (publicSessionView).
initAmbitionChoicePanel({
  getSessionId: () => state.sid,
  getBondHearts: () => Number(state.world?.bond_hearts) || 0,
});

// Sprint 2026-04-26 telemetria VC compromesso — Carattere panel (🎭).
// 4 MBTI bars (E↔I/S↔N/T↔F/J↔P) + Ennea badge grid. Phone-side dettaglio
// numerico. TV side rimane pulito (vcTvHud flash diegetici).
initCharacterPanel({
  getSessionId: () => state.sid,
  getSelectedUnit: () =>
    state.world && state.selected
      ? getUnits(state.world).find((u) => u.id === state.selected) || null
      : null,
});

window.__evo = {
  state,
  api,
  refresh,
  refreshVcSnapshot,
  advanceCampaignWithEvolvePrompt,
  openFormsPanel,
  openThoughtsPanel,
  openRitualPanel,
  openCharacterPanel,
  openSkivPanel,
  lobbyBridge,
};

// Skiv-as-Monitor — overlay panel + header btn 🦎 Skiv (Phase 2 wire 2026-04-25).
// Indipendente da session/campaign — feed creatura da git events sempre disponibile.
initSkivPanel();

// OD-001 Path A Sprint A — Nest Hub overlay + header btn 🏠 Nido.
// Visibility gated by state.world.nido_unlocked (toggled in refresh()).
function updateNestButtonVisibility(unlocked) {
  const btn = document.getElementById('nest-open');
  if (!btn) return;
  btn.style.display = unlocked ? '' : 'none';
}
initNestHub({
  getPartyMember: () => {
    if (!state.world || !state.selected) return null;
    const u = getUnits(state.world).find((u) => u.id === state.selected);
    if (!u) return null;
    return {
      mbti_type: u.mbti_type || 'NEUTRA',
      trait_ids: Array.isArray(u.trait_ids) ? u.trait_ids : [],
    };
  },
  openCodex: () => toggleCodex(),
});
window.__evo = window.__evo || {};
window.__evo.openNestHub = openNestHub;
