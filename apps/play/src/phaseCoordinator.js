// M17/M18/M19 — Phase coordinator: switch phone overlay based on coop phase.
// Phases: lobby | character_creation | world_setup | combat | debrief | ended.

import { renderCharacterCreation, wireCharacterCreation } from './characterCreation.js';
import './characterCreation.css';
import { renderWorldSetup, wireWorldSetup } from './worldSetup.js';
import './worldSetup.css';
import { renderDebriefPanel, wireDebriefPanel } from './debriefPanel.js';
import './debriefPanel.css';
// OD-013 Path B — MBTI dialogue color palette CSS (8 axis classes + tooltip).
// Co-located con debriefPanel: il narrative log è il primo consumer.
import './dialogueRender.css';

export function createPhaseCoordinator(bridge) {
  if (!bridge) return null;
  const state = {
    currentPhase: null,
    lastWorldState: null,
    api: {
      characterCreation: null,
      worldSetup: null,
      debrief: null,
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

  function ensureDebrief() {
    if (state.api.debrief) return state.api.debrief;
    const overlay = renderDebriefPanel();
    const api = wireDebriefPanel(overlay, bridge);
    state.api.debrief = api;
    return api;
  }

  function hideAllPhaseOverlays() {
    const cc = document.getElementById('char-creation-overlay');
    if (cc) cc.classList.add('cc-hidden');
    const ws = document.getElementById('world-setup-overlay');
    if (ws) ws.classList.add('ws-hidden');
    const db = document.getElementById('debrief-overlay');
    if (db) db.classList.add('db-hidden');
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
      case 'debrief': {
        const dbApi = ensureDebrief();
        dbApi.reset();
        if (state.lastWorldState) dbApi.setState(state.lastWorldState, null);
        dbApi.show();
        // V2 Tri-Sorgente — fetch reward offer if campaign present.
        try {
          const summary = bridge?.getCampaignSummary?.();
          const cid = summary?.id || summary?.campaign_id || null;
          const actorId = bridge?.session?.player_id || bridge?.session?.actor_id || null;
          if (cid && dbApi.showRewardOffer) dbApi.showRewardOffer(cid, actorId);
        } catch {
          /* reward offer optional */
        }
        // Sprint 10 (Surface-DEAD #7): pipe QBN narrative event quando debrief
        // payload include narrative_event (rewardEconomy.buildDebriefSummary).
        // bridge.lastDebrief è una cache del response /api/session/end o del
        // payload coop debrief broadcast. Fail-safe: setter ignora null.
        try {
          const debriefPayload = bridge?.lastDebrief || bridge?.session?.lastDebrief || null;
          const narrativeEvent = debriefPayload?.narrative_event || null;
          if (dbApi.setNarrativeEvent) dbApi.setNarrativeEvent(narrativeEvent);
          // Sprint 12 (Surface-DEAD #4): pipe lineage eligibles dal debrief.
          // mating_eligibles è array di pair-bond candidates (post-victory).
          const matingEligibles = Array.isArray(debriefPayload?.mating_eligibles)
            ? debriefPayload.mating_eligibles
            : [];
          if (dbApi.setLineageEligibles) dbApi.setLineageEligibles(matingEligibles);
          // Sprint Surface-DEAD ennea: pipe ennea_archetypes per current player
          // dal debriefPayload.vc_summary.per_actor[playerId].
          const playerId = bridge?.session?.player_id || bridge?.session?.actor_id || null;
          const enneaArchetypes = playerId
            ? debriefPayload?.vc_summary?.per_actor?.[playerId]?.ennea_archetypes
            : null;
          if (dbApi.setEnneaArchetypes) dbApi.setEnneaArchetypes(enneaArchetypes);
          // 2026-05-06 TKT-P4-ENNEA-VOICE-FRONTEND: pipe 9/9 voice palette
          // dal debriefPayload.ennea_voices (rewardEconomy.buildDebriefSummary
          // emit array of {actor_id, archetype_id, beat_id, line_id, text}).
          const enneaVoices = Array.isArray(debriefPayload?.ennea_voices)
            ? debriefPayload.ennea_voices
            : [];
          if (dbApi.setEnneaVoices) dbApi.setEnneaVoices(enneaVoices);
        } catch {
          /* narrative event + lineage + ennea + voices optional */
        }
        break;
      }
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

  function onDebriefReadyList(payload) {
    if (state.api.debrief) {
      const readyIds = (payload?.ready_list || []).filter((e) => e.ready).map((e) => e.player_id);
      state.api.debrief.setReadyList(readyIds);
      state.api.debrief.setState(state.lastWorldState, payload?.outcome);
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
    if (state.api.debrief?.setParty) {
      state.api.debrief.setParty(players);
    }
  }

  function onWorldState(worldState) {
    state.lastWorldState = worldState;
    if (state.currentPhase === 'debrief' && state.api.debrief) {
      state.api.debrief.setState(worldState, null);
    }
  }

  return {
    applyPhase,
    onCharacterReadyList,
    onWorldTally,
    onDebriefReadyList,
    onPhaseChange,
    onPlayersChanged,
    onWorldState,
    get phase() {
      return state.currentPhase;
    },
  };
}
