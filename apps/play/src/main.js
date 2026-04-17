// Evo-Tactics Play — entry point. Orchestration layer.

import { api } from './api.js';
import { render, canvasToCell, CELL_SIZE } from './render.js';
import { renderUnits, appendLog, updateStatus } from './ui.js';

const state = {
  sid: null,
  world: null, // session state
  selected: null, // unit selected (player)
  target: null, // target preview (enemy hovered)
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
}

function updateHint(msg) {
  hintEl.textContent = msg;
}

function handleUnitClick(unit) {
  if (!state.world) return;
  if (unit.controlled_by === 'player') {
    if (unit.hp <= 0) {
      updateHint(`${unit.id} è KO.`);
      return;
    }
    state.selected = unit.id;
    state.target = null;
    updateHint(`Selezionato ${unit.id}. Click cella=move · click nemico=attack.`);
    redraw();
  } else {
    // Click su nemico → attack se unità selezionata valida
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

  // Cella vuota → move se unit selezionata
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
  appendLog(
    logEl,
    `${body.actor_id}: ${body.action_type} ${body.target_id || body.position?.x != null ? JSON.stringify(body.position || body.target_id) : ''}`,
  );
  await refresh();
}

async function refresh() {
  const r = await api.state(state.sid);
  if (r.ok) {
    state.world = r.data;
    // Deselect if unit no longer alive
    if (state.selected) {
      const sel = state.world.units.find((u) => u.id === state.selected);
      if (!sel || sel.hp <= 0) state.selected = null;
    }
    redraw();
  }
}

async function startNewSession() {
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

// Auto-start su load
startNewSession();

// Expose for debug
window.__evo = { state, api, refresh };
