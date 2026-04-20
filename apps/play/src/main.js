// Evo-Tactics Play — entry point. Orchestration layer.

import { api } from './api.js';
import { render, canvasToCell, needsAnimFrame } from './render.js';
import { renderUnits, appendLog, updateStatus, isUnitAlive, isUnitDead } from './ui.js';
import { renderAbilities, clearAbilities } from './abilityPanel.js';
import { detectEndgame, showEndgame, hideEndgame, nextScenarioId } from './endgame.js';
import {
  recordMove,
  pushPopup,
  flashUnit,
  attackRay,
  ACTION_ANIM_STAGGER_MS,
  COMMIT_REVEAL_MS,
} from './anim.js';
import { openReplay } from './replayPanel.js';
import { sfx, setMuted, isMuted } from './sfx.js';
import { initHelpPanel } from './helpPanel.js';
import { showTip, buildRecoveryTipMessage, resetAllTips } from './tips.js';
import { toggleCodex } from './codexPanel.js';
import { initFeedbackPanel } from './feedbackPanel.js';

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
const tooltipEl = document.getElementById('unit-tooltip');

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
  return `
    <strong>${unit.id}</strong>
    <div class="tt-faction-${faction}">${factionLabel} · <em>${job}</em></div>
    <div>HP ${hp} · AP ${ap}</div>
    ${statusTxt ? `<div>${statusTxt}</div>` : ''}
    ${intentBlock}
  `;
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
  if (target?.position && dmg !== 0) {
    const color = dmg < 0 ? FX_COLORS.heal : FX_COLORS.damage;
    const txt = dmg < 0 ? `+${-dmg}` : `-${dmg}`;
    pushPopup(target.position.x, target.position.y, txt, color);
    flashUnit(targetId || target.id, color);
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
    }
  }
  lastEventsCount = (newWorld?.events || []).length;
}

async function refresh() {
  const r = await api.state(state.sid);
  if (r.ok) {
    const prev = state.world;
    state.world = r.data;
    processNewEvents(prev, state.world);
    if (state.selected) {
      const sel = state.world.units.find((u) => u.id === state.selected);
      if (!sel || sel.hp <= 0) state.selected = null;
    }
    redraw();
    // Animation loop
    if (needsAnimFrame()) requestAnimationFrame(animTick);
  }
}

function animTick() {
  if (!state.world) return;
  redraw();
  if (needsAnimFrame()) requestAnimationFrame(animTick);
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
  const st = await api.start(sc.data.units, startOpts);
  if (!st.ok) {
    appendLog(logEl, `✖ session start: ${st.status}`, 'error');
    return;
  }
  state.sid = st.data.session_id;
  state.world = st.data.state;
  state.selected = null;
  state.target = null;
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

// W8O — Resize listener: redraw canvas quando viewport cambia (CELL dinamico).
let _resizeTimeout = null;
window.addEventListener('resize', () => {
  if (_resizeTimeout) clearTimeout(_resizeTimeout);
  _resizeTimeout = setTimeout(() => {
    if (state.world) redraw();
  }, 120);
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

loadModulations().then(() => startNewSession());
window.__evo = { state, api, refresh };
