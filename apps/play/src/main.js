// Evo-Tactics Play — entry point. Orchestration layer.

import { api } from './api.js';
import { render, canvasToCell, needsAnimFrame } from './render.js';
import { renderUnits, appendLog, updateStatus } from './ui.js';
import { renderAbilities, clearAbilities } from './abilityPanel.js';
import { detectEndgame, showEndgame, hideEndgame, nextScenarioId } from './endgame.js';
import { recordMove, pushPopup, flashUnit, attackRay } from './anim.js';
import { openReplay } from './replayPanel.js';
import { sfx, setMuted, isMuted } from './sfx.js';
import { initHelpPanel } from './helpPanel.js';

const state = {
  sid: null,
  world: null, // session state
  selected: null, // unit selected (player)
  target: null, // target preview (enemy hovered)
  pendingAbility: null, // { ability_id, needs_target, effect_type }
  endgameShown: false,
  // W4.1 — round model client-side tracking per badge UI
  pendingIntents: new Map(), // unit_id → intent object (reset post commit)
  // W4.3 — resolution order from last commit (unit_id → priority rank 1..N)
  lastResolutionOrder: new Map(),
  // W4.6 — planning timer start timestamp (null = not active)
  planningTimerStart: null,
  // W5.D — eval set Flint v0.3 decision trace (JSONL pairs per decision)
  evalSet: [],
};

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

// W4.6 — Planning timer 30s config + interval handle
const PLANNING_TIMER_MS = 30_000;
let planningTimerHandle = null;

const canvas = document.getElementById('grid');
const unitsUl = document.getElementById('units');
const logEl = document.getElementById('log');
const hintEl = document.getElementById('selected-hint');

function redraw() {
  if (!state.world) return;
  render(canvas, state.world, {
    selected: state.selected,
    target: state.target,
    active: state.world.active_unit,
    resolutionOrder: state.lastResolutionOrder,
  });
  renderUnits(
    unitsUl,
    state.world,
    state.selected,
    handleUnitClick,
    state.pendingIntents,
    handleCancelIntent,
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

// W6.2b — Cancel pending intent for a specific PG.
function handleCancelIntent(unitId) {
  if (!state.pendingIntents.has(unitId)) return;
  state.pendingIntents.delete(unitId);
  appendLog(logEl, `${unitId}: intent annullato`);
  updateHint(`Intent ${unitId} annullato. Re-pianifica o "Fine turno" per risolvere.`);
  redraw();
}

// W6.2b — ESC global: annulla tutti pending intents (planning reset).
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && state.pendingIntents.size > 0 && !state.pendingAbility) {
    const n = state.pendingIntents.size;
    state.pendingIntents.clear();
    appendLog(logEl, `ESC: ${n} intent annullati`);
    updateHint(`${n} intent cleared. Ri-pianifica round.`);
    redraw();
  }
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
    // Stub: icona pugno = intento attacco (mirror drawSisIntentIcon).
    // TODO ADR-04-18 Plan-Reveal: real intent da threat_preview payload backend.
    intentBlock = `<span class="tt-intent">✊ Intento: attacco (stub)</span>`;
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
  tooltipEl.style.left = `${ev.clientX + 14}px`;
  tooltipEl.style.top = `${ev.clientY + 14}px`;
  tooltipEl.classList.remove('hidden');
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

// M4 A.1 / W3 — Feature flag round model simultaneous.
// W3 fix #1: default ON (ADR-2026-04-15 round model canonical). User playtest M4 run1
// reported sequential feel: root cause = flag OFF default. Flip default ON, opt-out
// con localStorage.setItem('evo:round-flow','sequential') per regression test.
// ON = /api/session/declare-intent + /commit-round (simultaneous).
// Opt-out = /api/session/action + /api/session/turn/end (legacy).
function useRoundFlow() {
  try {
    return localStorage.getItem('evo:round-flow') !== 'sequential';
  } catch {
    return true;
  }
}

// M4 A.2 — Feature flag confirm action (2-step commit).
// Toggle: localStorage.setItem('evo:confirm-action','true') + reload.
// ON = primo click = pending preview (ghost), secondo click stessa cella/target = confirm.
function useConfirmAction() {
  try {
    return localStorage.getItem('evo:confirm-action') === 'true';
  } catch {
    return false;
  }
}

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
  if (!state.sid) return;
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
    // Map body → action shape per declareIntent
    const action = {
      type: body.action_type,
      actor_id: body.actor_id,
      ap_cost:
        body.action_type === 'attack'
          ? 1
          : body.action_type === 'move'
            ? manhattanApCost(body)
            : body.action_type === 'ability'
              ? body.ap_cost || 1
              : 0,
    };
    if (body.action_type === 'attack') action.target_id = body.target_id;
    if (body.action_type === 'move') action.move_to = body.position;
    if (body.action_type === 'ability') {
      action.ability_id = body.ability_id;
      action.target_id = body.target_id;
      if (body.position) action.position = body.position;
    }
    // Ensure roundState initialized
    if (!state.roundInit) {
      const bp = await api.beginPlanning(state.sid);
      if (!bp.ok) {
        appendLog(logEl, `✖ begin-planning: ${bp.data?.error || bp.status}`, 'error');
        return;
      }
      state.roundInit = true;
      // W4.6 — start planning timer on first declare
      startPlanningTimer();
    }
    const r = await api.declareIntent(state.sid, body.actor_id, action);
    if (!r.ok) {
      appendLog(logEl, `✖ ${r.data?.error || `HTTP ${r.status}`}`, 'error');
      updateHint(`❌ ${r.data?.error || 'Intent rifiutato.'} · riprova`);
      return;
    }
    // W4.1 — track intent client-side per badge sidebar. Latest-wins (re-declare override).
    state.pendingIntents.set(body.actor_id, action);
    const tag = body.ability_id
      ? `→ ability ${body.ability_id}${body.target_id ? ` → ${body.target_id}` : ''}`
      : body.action_type === 'move'
        ? `→ move [${body.position.x},${body.position.y}]`
        : `→ atk ${body.target_id}`;
    appendLog(logEl, `${body.actor_id}: ${tag} (pending)`);
    redraw();
    // W6.1 — Auto-commit rimosso (user bug report: "scatta il round appena clicco secondo PG").
    // Explicit "Fine turno" only. User può re-declare per cambiare idea.
    // Opt-in tramite localStorage flag `evo:auto-commit` = 'true' (power-user).
    const alivePlayers = (state.world?.units || []).filter(
      (u) => u.controlled_by === 'player' && u.hp > 0,
    );
    const allDeclared = alivePlayers.every((u) => state.pendingIntents.has(u.id));
    if (allDeclared && alivePlayers.length > 0) {
      const autoCommit = (() => {
        try {
          return localStorage.getItem('evo:auto-commit') === 'true';
        } catch {
          return false;
        }
      })();
      if (autoCommit) {
        updateHint(`✓ Tutti dichiarati. Auto-commit 250ms…`);
        setTimeout(() => triggerCommitRound(), 250);
      } else {
        updateHint(
          `✓ Tutti i player dichiarati (${alivePlayers.length}/${alivePlayers.length}). Click "Fine turno" per risolvere — o re-click per cambiare intent.`,
        );
      }
    } else {
      const remaining = alivePlayers.length - state.pendingIntents.size;
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
      const target = (newWorld.units || []).find((u) => u.id === ev.target_id);
      const actor = (newWorld.units || []).find((u) => u.id === ev.actor_id);
      // W2.3 — Attack ray actor → target
      if (actor?.position && target?.position) {
        const rayColor = actor.controlled_by === 'sistema' ? '#ff5252' : '#ffcc00';
        attackRay(actor.position, target.position, rayColor);
      }
      if (target && target.position && ev.damage_dealt !== 0) {
        const color = ev.damage_dealt < 0 ? '#4caf50' : '#ff5252';
        const txt = ev.damage_dealt < 0 ? `+${-ev.damage_dealt}` : `-${ev.damage_dealt}`;
        pushPopup(target.position.x, target.position.y, txt, color);
        // W2.3 — Flash target
        flashUnit(ev.target_id, color);
      }
      // SFX
      if (ev.damage_dealt < 0) sfx.heal();
      else if (ev.damage_dealt > 0) {
        // crit heuristic: dmg > 6 = crit
        if (Number(ev.damage_dealt) >= 6) sfx.crit();
        else sfx.hit();
      } else if (ev.result === 'miss' || ev.result === 'MISS') {
        sfx.miss();
      }
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
  state.pendingIntents.clear();
  state.lastResolutionOrder.clear();
  stopPlanningTimer();
  // W5.D — reset eval set per session
  state.evalSet = [];
  lastEventsCount = (state.world?.events || []).length;
  appendLog(logEl, `✓ sessione ${state.sid.slice(0, 8)}…`);
  const flags = [];
  if (useRoundFlow()) flags.push('round=simultaneous');
  if (useConfirmAction()) flags.push('confirm=on');
  const hint = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
  updateHint(`Sessione iniziata${hint}. Seleziona una tua unità.`);
  redraw();
}

document.getElementById('cancel-pending').addEventListener('click', () => cancelPendingAbility());
document.getElementById('new-session').addEventListener('click', () => {
  cancelPendingAbility(true);
  startNewSession();
});
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
        const target = (state.world?.units || []).find((u) => u.id === targetId);
        const actor = (state.world?.units || []).find((u) => u.id === actorId);
        // W2.3 — Attack ray + flash for SIS
        if (actor?.position && target?.position) {
          attackRay(actor.position, target.position, '#ff5252');
        }
        if (target && target.position && dmg) {
          pushPopup(
            target.position.x,
            target.position.y,
            dmg < 0 ? `+${-dmg}` : `-${dmg}`,
            dmg < 0 ? '#4caf50' : '#ff5252',
          );
          flashUnit(targetId, dmg < 0 ? '#4caf50' : '#ff5252');
        }
        if (dmg < 0) sfx.heal();
        else if (dmg > 0) Number(dmg) >= 6 ? sfx.crit() : sfx.hit();
        else sfx.miss();
      }
      appendLog(
        logEl,
        `SIS · ${actorId}: ${type}${targetId ? ` → ${targetId}` : ''}${dmg ? ` (${dmg})` : ''}`,
        'event',
      );
      if (needsAnimFrame()) requestAnimationFrame(animTick);
    }, delay);
    delay += 350; // stagger SIS actions so visible
  }
}

// W4 — commit-round factored out so auto-commit (W4.5) e end-turn button
// possono condividere la stessa logica + reveal overlay + priority badge.
async function triggerCommitRound() {
  if (!state.sid) return;
  sfx.turn_end();
  appendLog(logEl, '→ risolvo round');
  stopPlanningTimer();

  if (!state.roundInit) {
    const bp = await api.beginPlanning(state.sid);
    if (!bp.ok) {
      appendLog(logEl, `✖ begin-planning: ${bp.data?.error || bp.status}`, 'error');
      return;
    }
    state.roundInit = true;
  }
  const r = await api.commitRound(state.sid, true);
  if (!r.ok) {
    appendLog(logEl, `✖ commit-round: ${r.data?.error || r.status}`, 'error');
    return;
  }
  state.roundInit = false;
  _pendingConfirm = null;
  state.pendingIntents.clear();

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

  // W4.2 — commit reveal overlay pre-animations (700ms)
  const turnNum = (state.world?.turn || 0) + 1;
  showCommitReveal(turnNum, allActions.length);

  const REVEAL_MS = 700;
  setTimeout(() => {
    if (allActions.length > 0) processIaActions(allActions);
  }, REVEAL_MS);

  const totalDelay = REVEAL_MS + allActions.length * 350 + 200;
  setTimeout(async () => {
    await refresh();
    state.lastResolutionOrder.clear();
    redraw();
    appendLog(logEl, `✓ round ${state.world?.turn || '?'} risolto (${allActions.length} azioni)`);
  }, totalDelay);
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

// W4.6 — Planning timer: 30s countdown, auto-commit on expiry.
function startPlanningTimer() {
  stopPlanningTimer();
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
  const r = await api.endTurn(state.sid);
  if (!r.ok) {
    appendLog(logEl, `✖ end turn: ${r.status}`, 'error');
    return;
  }
  if (r.data?.ia_actions) processIaActions(r.data.ia_actions);
  const totalDelay = Array.isArray(r.data?.ia_actions) ? r.data.ia_actions.length * 350 + 200 : 200;
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
