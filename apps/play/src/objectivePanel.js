// Sprint 9 (Surface-DEAD #5) — Objective HUD top-bar.
//
// Engine LIVE: apps/backend/services/combat/objectiveEvaluator.js supporta
// 6 tipi (elimination, capture_point, escort, sabotage, survival, escape)
// + ritorna {completed, failed, progress, reason, outcome?} per encounter.
//
// Surface DEAD pre-Sprint 9: bridge calcolava objective_state ma niente lo
// esponeva al client. encounter.objective stesso non era nel publicSessionView.
//
// Surface NEW: GET /api/session/:id/objective ritorna config + evaluation.
// HUD top-bar mostra "🎯 OBIETTIVO: <label> · <progress>" + status (active /
// completed / failed). Player capisce subito cosa deve fare per vincere.

'use strict';

const TYPE_LABELS = {
  elimination: 'Elimina i nemici',
  capture_point: 'Tieni la zona',
  escort: 'Scorta il bersaglio',
  sabotage: 'Sabotaggio',
  survival: 'Sopravvivi',
  escape: 'Fuggi',
};

const TYPE_ICONS = {
  elimination: '⚔',
  capture_point: '🚩',
  escort: '🛡',
  sabotage: '💣',
  survival: '⏳',
  escape: '🏃',
};

// Pure: type → label IT (caps tag). Falls back a type stesso se sconosciuto.
export function labelForObjectiveType(type) {
  if (!type) return '—';
  const label = TYPE_LABELS[type];
  return label || String(type).replace(/_/g, ' ').toUpperCase();
}

// Pure: type → icon emoji.
export function iconForObjectiveType(type) {
  if (!type) return '📌';
  return TYPE_ICONS[type] || '📌';
}

// Pure: status string per HUD badge — derivato da evaluation.completed/failed.
//   completed=true → 'win'
//   failed=true → 'loss'
//   else → 'active'
export function statusForEvaluation(evaluation) {
  if (!evaluation || typeof evaluation !== 'object') return 'unknown';
  if (evaluation.completed === true) return 'win';
  if (evaluation.failed === true) return 'loss';
  return 'active';
}

// Pure: format progress object → human IT string. Keys aligned con il payload
// reale di apps/backend/services/combat/objectiveEvaluator.js evaluators.
//   elimination → {sistema, player}                (counts alive per faction)
//   capture_point → {turns_held, units_in_zone, target_turns}
//   survival → {turns_survived, target}
//   escape → {units_escaped, units_alive}
//   escort → {escort_hp, extracted}
//   sabotage → {sabotage_progress, units_in_zone, required}
// Robust a campi mancanti — fallback gracefully a empty string.
export function formatProgress(type, progress) {
  if (!progress || typeof progress !== 'object') return '';
  const p = progress;
  switch (type) {
    case 'elimination': {
      const sistema = Number(p.sistema ?? p.sistema_alive ?? 0);
      const player = Number(p.player ?? p.player_alive ?? 0);
      // Surface in stile "Sistema vivi: N · PG vivi: M" (player capisce subito)
      return `Sistema vivi: ${sistema} · PG: ${player}`;
    }
    case 'capture_point': {
      const turnsHeld = Number(p.turns_held ?? p.turns_in_zone ?? 0);
      const targetTurns = Number(p.target_turns ?? p.required_turns ?? 0);
      const inZone = Number(p.units_in_zone ?? p.players_in_zone ?? 0);
      if (inZone <= 0) return targetTurns > 0 ? '0 PG in zona' : '';
      const base = targetTurns > 0 ? `${turnsHeld}/${targetTurns} round in zona` : '';
      return base ? `${base} · ${inZone} PG dentro` : `${inZone} PG in zona`;
    }
    case 'survival': {
      const turn = Number(p.turns_survived ?? p.turn ?? 0);
      const target = Number(p.target ?? p.target_turn ?? p.survive_turns ?? 0);
      return target > 0 ? `Round ${turn}/${target}` : `Round ${turn}`;
    }
    case 'escape': {
      const escaped = Number(p.units_escaped ?? p.players_in_zone ?? p.escaped ?? 0);
      const total = Number(p.units_alive ?? p.total_players ?? p.total ?? 0);
      return total > 0 ? `${escaped}/${total} fuggiti` : '';
    }
    case 'escort': {
      const hp = Number(p.escort_hp ?? -1);
      const extracted = p.extracted === true;
      const aliveTxt = hp > 0 ? `HP ${hp}` : 'KO';
      const zoneTxt = extracted ? 'in zona estrazione' : 'in viaggio';
      return `Bersaglio ${aliveTxt} · ${zoneTxt}`;
    }
    case 'sabotage': {
      const turns = Number(p.sabotage_progress ?? p.turns_in_zone ?? 0);
      const required = Number(p.required ?? p.required_turns ?? 0);
      const inZone = Number(p.units_in_zone ?? p.players_in_zone ?? 0);
      const base = required > 0 ? `${turns}/${required} round in zona` : '';
      return inZone > 0 && base ? `${base} · ${inZone} PG dentro` : base;
    }
    default:
      return '';
  }
}

// Pure: payload (response da api.objective) → HTML innerHTML for HUD bar.
// Fail-safe: any missing field → empty/placeholder string, mai crash.
export function formatObjectiveBar(payload) {
  if (!payload || typeof payload !== 'object') {
    return '<span class="obj-empty">—</span>';
  }
  const objective = payload.objective;
  if (!objective || !objective.type) {
    return '<span class="obj-empty">— Nessun obiettivo dichiarato</span>';
  }
  const icon = iconForObjectiveType(objective.type);
  const label = labelForObjectiveType(objective.type);
  const status = statusForEvaluation(payload.evaluation);
  const progress = formatProgress(objective.type, payload.evaluation?.progress);
  const statusBadge =
    status === 'win'
      ? '<span class="obj-status obj-status-win">✓ COMPLETATO</span>'
      : status === 'loss'
        ? '<span class="obj-status obj-status-loss">✕ FALLITO</span>'
        : '';
  const progressEl = progress ? `<span class="obj-progress">· ${escapeHtml(progress)}</span>` : '';
  return (
    `<span class="obj-icon">${icon}</span>` +
    `<span class="obj-label">${escapeHtml(label)}</span>` +
    progressEl +
    statusBadge
  );
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c],
  );
}

// Side effect: render payload into HUD container element.
// Idempotent — sostituisce innerHTML. Aggiunge class status-* per styling.
// Se payload missing/no objective → svuota e nasconde container.
export function renderObjectiveBar(containerEl, payload) {
  if (!containerEl || typeof containerEl.innerHTML !== 'string') return;
  if (!payload || !payload.objective || !payload.objective.type) {
    containerEl.innerHTML = '';
    containerEl.classList.add('obj-hidden');
    return;
  }
  containerEl.classList.remove('obj-hidden');
  containerEl.innerHTML = formatObjectiveBar(payload);
  // Status class su container per CSS hooks (e.g. ring color quando win).
  containerEl.classList.remove('obj-status-active', 'obj-status-win', 'obj-status-loss');
  const status = statusForEvaluation(payload.evaluation);
  containerEl.classList.add(`obj-status-${status}`);
}
