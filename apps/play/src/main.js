// Evo-Tactics Play — entry point. Orchestration layer.

import { api } from './api.js';
import { render, canvasToCell } from './render.js';
import { renderUnits, appendLog, updateStatus } from './ui.js';
import { renderAbilities, clearAbilities } from './abilityPanel.js';
import { detectEndgame, showEndgame, hideEndgame, nextScenarioId } from './endgame.js';

const state = {
  sid: null,
  world: null, // session state
  selected: null, // unit selected (player)
  target: null, // target preview (enemy hovered)
  pendingAbility: null, // { ability_id, needs_target, effect_type }
  endgameShown: false,
};

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
  });
  renderUnits(unitsUl, state.world, state.selected, handleUnitClick);
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
}

function handleAbilitySelect(ab) {
  if (!state.selected) return;
  if (!ab.needs_target) {
    // Self-cast or no target
    doAction({
      action_type: 'ability',
      actor_id: state.selected,
      ability_id: ab.ability_id,
    });
    return;
  }
  state.pendingAbility = ab;
  setAbilityTargetMode(true);
  updateHint(`Seleziona target per ability ${ab.ability_id}. Click unità o ESC per annullare.`);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.pendingAbility) {
    state.pendingAbility = null;
    setAbilityTargetMode(false);
    updateHint(`Ability annullata.`);
  }
});

function handleUnitClick(unit) {
  if (!state.world) return;
  // Ability targeting mode
  if (state.pendingAbility) {
    const ab = state.pendingAbility;
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
  if (unit.controlled_by === 'player') {
    if (unit.hp <= 0) {
      updateHint(`${unit.id} è KO.`);
      return;
    }
    state.selected = unit.id;
    state.target = null;
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
    updateHint(`Ability richiede unit target. Premi ESC per annullare.`);
    return;
  }
  if (!state.selected) {
    updateHint('Click su una tua unità per selezionarla.');
    return;
  }
  doAction({ action_type: 'move', actor_id: state.selected, position: { x, y } });
});

async function doAction(body) {
  if (!state.sid) return;
  body.session_id = state.sid;
  const r = await api.action(body);
  if (!r.ok) {
    appendLog(logEl, `✖ ${r.data?.error || `HTTP ${r.status}`}`, 'error');
    updateHint(r.data?.error || 'Azione rifiutata.');
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

async function refresh() {
  const r = await api.state(state.sid);
  if (r.ok) {
    state.world = r.data;
    if (state.selected) {
      const sel = state.world.units.find((u) => u.id === state.selected);
      if (!sel || sel.hp <= 0) state.selected = null;
    }
    redraw();
  }
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
  const st = await api.start(sc.data.units);
  if (!st.ok) {
    appendLog(logEl, `✖ session start: ${st.status}`, 'error');
    return;
  }
  state.sid = st.data.session_id;
  state.world = st.data.state;
  state.selected = null;
  state.target = null;
  appendLog(logEl, `✓ sessione ${state.sid.slice(0, 8)}…`);
  updateHint('Sessione iniziata. Seleziona una tua unità.');
  redraw();
}

document.getElementById('new-session').addEventListener('click', startNewSession);
document.getElementById('end-turn').addEventListener('click', async () => {
  if (!state.sid) return;
  appendLog(logEl, '→ fine turno');
  const r = await api.endTurn(state.sid);
  if (!r.ok) {
    appendLog(logEl, `✖ end turn: ${r.status}`, 'error');
    return;
  }
  state.world = r.data?.state || state.world;
  await refresh();
  appendLog(logEl, '✓ SIS ha agito');
});

startNewSession();
window.__evo = { state, api, refresh };
