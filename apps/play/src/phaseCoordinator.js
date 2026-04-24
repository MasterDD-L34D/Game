// M17/M18 — Phase coordinator: switch phone overlay based on coop phase.
// Phases: lobby | character_creation | world_setup | combat | debrief | ended.

import { renderCharacterCreation, wireCharacterCreation } from './characterCreation.js';
import './characterCreation.css';
import { renderWorldSetup, wireWorldSetup } from './worldSetup.js';
import './worldSetup.css';

export function createPhaseCoordinator(bridge) {
  if (!bridge) return null;
  const state = {
    currentPhase: null,
    api: {
      characterCreation: null,
      worldSetup: null,
    },
  };

  function ensureCharacterCreation() {
    if (state.api.characterCreation) return state.api.characterCreation;
    const overlay = renderCharacterCreation();
    const api = wireCharacterCreation(overlay, bridge);
    state.api.characterCreation = api;
    return api;
  }

  function ensureWorldSetup() {
    if (state.api.worldSetup) return state.api.worldSetup;
    const overlay = renderWorldSetup();
    const api = wireWorldSetup(overlay, bridge);
    state.api.worldSetup = api;
    return api;
  }

  function hideAllPhaseOverlays() {
    const cc = document.getElementById('char-creation-overlay');
    if (cc) cc.classList.add('cc-hidden');
    const ws = document.getElementById('world-setup-overlay');
    if (ws) ws.classList.add('ws-hidden');
    const phv2 = document.getElementById('phone-overlay-v2');
    if (phv2) phv2.style.display = 'none';
  }

  function showCombatComposer() {
    const phv2 = document.getElementById('phone-overlay-v2');
    if (phv2) phv2.style.display = '';
  }

  function applyPhase(phase) {
    if (state.currentPhase === phase) return;
    state.currentPhase = phase;
    hideAllPhaseOverlays();
    switch (phase) {
      case 'character_creation':
        ensureCharacterCreation().show();
        break;
      case 'world_setup':
        ensureWorldSetup().show();
        break;
      case 'combat':
      case 'resolving':
      case 'planning':
      case 'ready':
        showCombatComposer();
        hideWaitingOverlay();
        break;
      case 'debrief':
        // MVP M18: show waiting card; M19 replaces with debrief UI.
        showWaitingOverlay('🏁 Debrief — in attesa scelta');
        break;
      case 'ended':
        showWaitingOverlay('🏁 Partita finita — grazie per aver giocato');
        break;
      case 'lobby':
      default:
        showWaitingOverlay("⏸ In attesa dell'host…");
    }
  }

  function showWaitingOverlay(msg) {
    let el = document.getElementById('phase-waiting-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'phase-waiting-overlay';
      el.className = 'phase-waiting-overlay';
      el.innerHTML = '<div class="phase-waiting-card"><span id="phase-waiting-msg"></span></div>';
      document.body.appendChild(el);
    }
    const msgEl = el.querySelector('#phase-waiting-msg');
    if (msgEl) msgEl.textContent = msg;
    el.style.display = '';
  }

  function hideWaitingOverlay() {
    const el = document.getElementById('phase-waiting-overlay');
    if (el) el.style.display = 'none';
  }

  function onCharacterReadyList(list) {
    if (state.api.characterCreation?.onCharacterReadyList) {
      state.api.characterCreation.onCharacterReadyList(list);
    }
  }

  function onWorldTally(tally) {
    if (state.api.worldSetup?.onWorldTally) {
      state.api.worldSetup.onWorldTally(tally);
    }
  }

  function onPhaseChange(payload) {
    applyPhase(payload?.phase || 'lobby');
    if (state.api.worldSetup?.onPhaseChange) {
      state.api.worldSetup.onPhaseChange(payload);
    }
  }

  function onPlayersChanged(players) {
    if (state.api.worldSetup?.onPlayersChanged) {
      state.api.worldSetup.onPlayersChanged(players);
    }
  }

  return {
    applyPhase,
    onCharacterReadyList,
    onWorldTally,
    onPhaseChange,
    onPlayersChanged,
    get phase() {
      return state.currentPhase;
    },
  };
}
