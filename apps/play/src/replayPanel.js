// Replay viewer — GET /api/session/:id/replay + render evento-per-evento.
// Richiede createReplayEngine-like logica in browser. MVP: traccia timeline
// + click step → apply event su snapshot working copy.

import { api } from './api.js';
import { render } from './render.js';

let viewer = null;

// W8b — normalize position shape (accept array or object, return {x,y} or null).
// Canonical converter — backend può ritornare sia [x,y] che {x,y} in events.
function normalizePos(pos) {
  if (!pos) return null;
  if (Array.isArray(pos)) return { x: Number(pos[0]) || 0, y: Number(pos[1]) || 0 };
  if (typeof pos === 'object') return { x: Number(pos.x) || 0, y: Number(pos.y) || 0 };
  return null;
}

function applyEvent(units, ev) {
  if (!ev || !Array.isArray(units)) return units;
  const out = units.map((u) => ({ ...u, position: u.position ? { ...u.position } : null }));
  const actor = out.find((u) => u.id === ev.actor_id);
  const target = out.find((u) => u.id === ev.target_id);

  switch (ev.action_type) {
    case 'move':
    case 'step':
      if (actor && ev.position_to) {
        const np = normalizePos(ev.position_to);
        if (np) actor.position = np;
      }
      break;
    case 'attack':
    case 'ability':
    case 'counter':
    case 'bleed':
      if (target && Number.isFinite(Number(ev.damage_dealt))) {
        target.hp = Math.max(0, (Number(target.hp) || 0) - Number(ev.damage_dealt));
      }
      break;
    case 'heal':
      if (target && Number.isFinite(Number(ev.damage_dealt))) {
        const heal = Math.abs(Number(ev.damage_dealt));
        const max = Number(target.max_hp || target.hp_max || Infinity);
        target.hp = Math.min(max, (Number(target.hp) || 0) + heal);
      }
      break;
    default:
      break;
  }
  return out;
}

function rebuildStateAt(payload, step) {
  const initial = payload.units_snapshot_initial || [];
  let units = initial.map((u) => ({ ...u, position: u.position ? { ...u.position } : null }));
  for (let i = 0; i < step && i < (payload.events || []).length; i++) {
    units = applyEvent(units, payload.events[i]);
  }
  return units;
}

export async function openReplay(sid) {
  if (viewer) {
    viewer.remove();
    viewer = null;
  }
  const r = await api.replay(sid);
  if (!r.ok || !r.data) {
    alert(`Replay non disponibile: ${r.status}`);
    return;
  }
  const payload = r.data;
  const events = payload.events || [];

  viewer = document.createElement('div');
  viewer.id = 'replay-viewer';
  viewer.innerHTML = `
    <div class="replay-card">
      <div class="replay-header">
        <h2>📽 Replay · ${payload.session_id?.slice(0, 8) || '—'}</h2>
        <button id="replay-close">✕</button>
      </div>
      <canvas id="replay-canvas" width="512" height="512"></canvas>
      <div class="replay-controls">
        <button id="replay-first">⏮</button>
        <button id="replay-prev">◀</button>
        <button id="replay-play">▶</button>
        <button id="replay-next">▶</button>
        <button id="replay-last">⏭</button>
        <span id="replay-step">0 / ${events.length}</span>
      </div>
      <div id="replay-event-info"></div>
    </div>
  `;
  document.body.appendChild(viewer);

  const canvas = viewer.querySelector('#replay-canvas');
  const stepSpan = viewer.querySelector('#replay-step');
  const eventInfo = viewer.querySelector('#replay-event-info');
  let cursor = 0;
  let playing = false;
  let playTimer = null;

  function redraw() {
    const units = rebuildStateAt(payload, cursor);
    const grid = payload.grid || { width: 8, height: 8 };
    const world = { grid, units, active_unit: null };
    render(canvas, world, {});
    stepSpan.textContent = `${cursor} / ${events.length}`;
    const ev = cursor > 0 ? events[cursor - 1] : null;
    eventInfo.innerHTML = ev
      ? `<strong>T${ev.turn}</strong> · <code>${ev.action_type}</code> · ${ev.actor_id || '—'}${ev.target_id ? ` → ${ev.target_id}` : ''}${ev.damage_dealt ? ` · dmg ${ev.damage_dealt}` : ''} · ${ev.result || ''}`
      : '<em>Inizio partita</em>';
  }

  function stepTo(s) {
    cursor = Math.max(0, Math.min(events.length, s));
    redraw();
  }

  function togglePlay() {
    playing = !playing;
    const btn = viewer.querySelector('#replay-play');
    btn.textContent = playing ? '⏸' : '▶';
    if (playing) {
      playTimer = setInterval(() => {
        if (cursor >= events.length) {
          playing = false;
          btn.textContent = '▶';
          clearInterval(playTimer);
          return;
        }
        stepTo(cursor + 1);
      }, 600);
    } else if (playTimer) {
      clearInterval(playTimer);
    }
  }

  viewer.querySelector('#replay-first').onclick = () => stepTo(0);
  viewer.querySelector('#replay-prev').onclick = () => stepTo(cursor - 1);
  viewer.querySelector('#replay-play').onclick = togglePlay;
  viewer.querySelector('#replay-next').onclick = () => stepTo(cursor + 1);
  viewer.querySelector('#replay-last').onclick = () => stepTo(events.length);
  viewer.querySelector('#replay-close').onclick = () => {
    if (playTimer) clearInterval(playTimer);
    viewer.remove();
    viewer = null;
  };

  redraw();
}
