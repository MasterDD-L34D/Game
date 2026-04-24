// M17 — Phase coordinator: switch phone overlay based on coop phase.
// Phases: lobby | character_creation | world_setup | combat | debrief | ended.

import { renderCharacterCreation, wireCharacterCreation } from './characterCreation.js';
import './characterCreation.css';

export function createPhaseCoordinator(bridge) {
  if (!bridge) return null;
  const state = {
    currentPhase: null,
    api: {
      characterCreation: null,
    },
  };

  function ensureCharacterCreation() {
    if (state.api.characterCreation) return state.api.characterCreation;
    const overlay = renderCharacterCreation();
    const api = wireCharacterCreation(overlay, bridge);
    state.api.characterCreation = api;
    return api;
  }

  function hideAllPhaseOverlays() {
    const cc = document.getElementById('char-creation-overlay');
    if (cc) cc.classList.add('cc-hidden');
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
        // MVP M17: show waiting card; M18 replaces with world setup UI.
        showWaitingOverlay("🗺 Scegliete scenario — in attesa dell'host");
        break;
      case 'combat':
      case 'resolving':
      case 'planning':
      case 'ready':
        showCombatComposer();
        hideWaitingOverlay();
        break;
      case 'debrief':
        // MVP M17: show waiting card; M19 replaces with debrief UI.
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

  return {
    applyPhase,
    onCharacterReadyList,
    get phase() {
      return state.currentPhase;
    },
  };
}
