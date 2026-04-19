// W8h — Contextual first-time tip system (Evo-Tactics onboarding philosophy:
// learn-by-doing, non scripted). Tips triggered by interaction first-time,
// dismissible, persistono seen flag via localStorage.
//
// Reference: Into the Breach (predicted damage reveal), Slay the Spire (hover),
// Fell Seal (first-ability tip), Dark Souls (minimal scripted).

const LS_PREFIX = 'evo:tip-';

// Tip catalog canonical — ogni tip triggered una volta per localStorage key.
const TIPS = {
  'select-unit': {
    icon: '👆',
    title: 'Seleziona unità',
    message:
      'Click su una unità blu per selezionarla. Range move (blu) + attack (rosso) appariranno sul canvas.',
    duration: 5000,
  },
  'first-move': {
    icon: '➡️',
    title: 'Movimento dichiarato',
    message:
      'Intent salvato ✓. Ogni cella costa 1 AP. Seleziona altra unità o "Fine turno" per risolvere.',
    duration: 4000,
  },
  'first-attack': {
    icon: '⚔️',
    title: 'Attacco dichiarato',
    message: 'Attacco costa 1 AP. Premi "Fine turno" (o Enter) per risolvere round simultaneo.',
    duration: 4000,
  },
  'first-ability': {
    icon: '✨',
    title: 'Ability selezionata',
    message: 'Click target (nemico/alleato/cella). ESC per annullare. AP cost indicato sulla chip.',
    duration: 4000,
  },
  'range-overlay': {
    icon: '🎯',
    title: 'Range visualizzato',
    message: 'BLU = celle movimento (costo AP indicato) · ROSSO = nemici attaccabili entro range.',
    duration: 4500,
  },
  'intent-declared': {
    icon: '💾',
    title: 'Intent salvato',
    message:
      'Re-click stessa action per cambiare idea. ✕ per annullare singolo. ESC annulla tutti.',
    duration: 3500,
  },
  'round-resolve': {
    icon: '⚔️',
    title: 'Round simultaneo',
    message:
      'Tutte azioni risolte contemporaneamente per reaction_speed (initiative + action_speed).',
    duration: 4000,
  },
  'invalid-action': {
    icon: '❌',
    title: 'Azione invalida',
    message: '', // dynamic per error context
    duration: 4500,
  },
  'sis-intent': {
    icon: '✊',
    title: 'Intento SIS',
    message: "L'icona ✊ sopra nemico = intento attacco prossimo turno. Hover per dettagli.",
    duration: 4000,
  },
};

function getLS(key) {
  try {
    return localStorage.getItem(LS_PREFIX + key);
  } catch {
    return null;
  }
}
function setLS(key, value) {
  try {
    localStorage.setItem(LS_PREFIX + key, value);
  } catch {
    /* ignore */
  }
}

export function hasTipBeenShown(tipKey) {
  return getLS(tipKey) === 'shown';
}

export function markTipShown(tipKey) {
  setLS(tipKey, 'shown');
}

// W8h debug — reset all tips (power user: localStorage.clear OR via __dbg).
export function resetAllTips() {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(LS_PREFIX));
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

let currentDismissTimer = null;
let currentEscHandler = null;

function getOrCreatePopup() {
  let popup = document.getElementById('tip-popup');
  if (popup) return popup;
  popup = document.createElement('div');
  popup.id = 'tip-popup';
  popup.className = 'tip-popup hidden';
  popup.innerHTML = `
    <div class="tip-content">
      <div class="tip-header">
        <span class="tip-icon"></span>
        <strong class="tip-title"></strong>
        <button class="tip-close" title="Chiudi (ESC)">✕</button>
      </div>
      <div class="tip-body"></div>
      <div class="tip-dismiss">ESC o click ✕ per chiudere · non verrà mostrato di nuovo</div>
    </div>
  `;
  document.body.appendChild(popup);
  popup.querySelector('.tip-close').addEventListener('click', dismissTip);
  return popup;
}

function dismissTip() {
  const popup = document.getElementById('tip-popup');
  if (popup) popup.classList.add('hidden');
  if (currentDismissTimer) {
    clearTimeout(currentDismissTimer);
    currentDismissTimer = null;
  }
  if (currentEscHandler) {
    document.removeEventListener('keydown', currentEscHandler);
    currentEscHandler = null;
  }
}

// W8h — Core API. showTip(tipKey, overrideMessage?).
// Se tip già seen → no-op silenzioso. Idempotent.
export function showTip(tipKey, overrideMessage = null) {
  if (hasTipBeenShown(tipKey)) return;
  const meta = TIPS[tipKey];
  if (!meta) return;
  const popup = getOrCreatePopup();
  popup.querySelector('.tip-icon').textContent = meta.icon;
  popup.querySelector('.tip-title').textContent = meta.title;
  popup.querySelector('.tip-body').textContent = overrideMessage || meta.message;
  popup.classList.remove('hidden');
  markTipShown(tipKey);

  // Dismiss timer
  if (currentDismissTimer) clearTimeout(currentDismissTimer);
  currentDismissTimer = setTimeout(dismissTip, meta.duration || 4000);

  // ESC dismiss
  if (currentEscHandler) document.removeEventListener('keydown', currentEscHandler);
  currentEscHandler = (e) => {
    if (e.key === 'Escape') dismissTip();
  };
  document.addEventListener('keydown', currentEscHandler);
}

// W8h — Error recovery tip builder. Maps backend error → player-friendly tip.
// Returns null if no match (caller falls back to standard error display).
export function buildRecoveryTipMessage(errorText) {
  if (!errorText) return null;
  const lower = String(errorText).toLowerCase();
  const map = [
    {
      match: /range|too far|distanza|lontano/,
      msg: "📍 Troppo lontano. Sposta prima l'unità più vicino (numeri blu = costo AP per ogni cella).",
    },
    {
      match: /ap|azioni esaurite|insufficient/,
      msg: '⚡ AP esaurite. Questa unità non può fare altro turno. Cambia PG o "Fine turno".',
    },
    {
      match: /target|bersaglio|invalid/,
      msg: '🎯 Target invalido. Seleziona nemico (rombo rosso) entro range (celle rosse).',
    },
    {
      match: /occupied|occupata|blocker|blocked/,
      msg: '🧍 Cella occupata. Scegli cella vuota (overlay blu senza unità).',
    },
    {
      match: /dead|ko|hp 0/,
      msg: "☠ Unità KO. Seleziona un'altra unità viva.",
    },
  ];
  for (const rule of map) {
    if (rule.match.test(lower)) return rule.msg;
  }
  return null;
}
