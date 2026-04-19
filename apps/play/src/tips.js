// W8h/8i — Contextual first-time tip modal (Evo-Tactics onboarding philosophy:
// learn-by-doing). Tips triggered by interaction first-time, persistono seen
// flag via localStorage.
//
// W8i correction: popup → MODAL BLOCCANTE center-screen con backdrop dim.
// Auto-dismiss rimosso — solo click "OK" chiude. Support multi-step pages via
// "Avanti ►" / "◄ Indietro" buttons per info complesse.

const LS_PREFIX = 'evo:tip-';

// Tip catalog canonical. `pages` array supporta multi-step (se 1 pagina = classic tip).
// Ogni page: { body: string, heading?: string }.
const TIPS = {
  'select-unit': {
    icon: '👆',
    title: 'Seleziona unità',
    pages: [
      {
        body: 'Click su una unità BLU per selezionarla.\n\nVedrai apparire sul canvas:\n• BLU = celle movimento (con costo AP)\n• ROSSO = nemici attaccabili entro range',
      },
      {
        body: "Puoi anche usare le ability dalla barra in fondo o dalle chip nella scheda PG.\n\nOgni azione dichiarata = 'intent'. Si risolvono tutte insieme quando clicchi 'Fine turno'.",
      },
    ],
  },
  'first-move': {
    icon: '➡️',
    title: 'Movimento dichiarato',
    pages: [
      {
        body: 'Intent salvato ✓\n\nOgni cella costa 1 AP. Puoi cambiare idea: re-click altra cella per override, ✕ accanto al badge per annullare.',
      },
      {
        body: "Quando hai finito di pianificare tutti i PG, clicca 'Fine turno' (o premi Enter). Round si risolve simultaneamente.",
      },
    ],
  },
  'first-attack': {
    icon: '⚔️',
    title: 'Attacco dichiarato',
    pages: [
      {
        body: 'Attacco = 1 AP. Tirata d20 + mod vs DC target.\n\nHit chance visibile nel tooltip. Margin of Success determina damage (1-3 o ability-specific).',
      },
      {
        body: "Premi 'Fine turno' (o Enter) per risolvere. Attacchi simultanei vs nemici = combo focus_fire +1 damage bonus (co-op).",
      },
    ],
  },
  'first-ability': {
    icon: '✨',
    title: 'Ability selezionata',
    pages: [
      {
        body: 'Click target (nemico/alleato/cella) per dichiarare ability.\n\nAP cost visibile sulla chip. Cooldown dopo uso.',
      },
      {
        body: 'ESC annulla ability pending. Re-click stessa ability = cambia target. Combo PP (movement combo points) alimenta ability Tier 2+.',
      },
    ],
  },
  'range-overlay': {
    icon: '🎯',
    title: 'Range visualizzato',
    pages: [
      {
        body: "Overlay canvas post-selezione unità:\n\n• BLU semi-trasparente = celle movimento (Manhattan distance ≤ AP)\n• Numero 'N AP' = costo movimento (white on dark badge)\n• ROSSO = nemici entro attack range (Chebyshev distance)",
      },
    ],
  },
  'intent-declared': {
    icon: '💾',
    title: 'Intent salvato',
    pages: [
      {
        body: 'Re-click stessa action per cambiare idea (latest-wins).\n\n✕ accanto al badge = annulla solo quella unità. ESC = annulla tutti i pending.',
      },
    ],
  },
  'round-resolve': {
    icon: '⚔️',
    title: 'Round simultaneo',
    pages: [
      {
        body: 'Tutte azioni risolte contemporaneamente per ordine di reaction_speed.\n\nFormula: initiative + action_speed(attack/move/ability) - status_penalty',
      },
      {
        body: 'Badge #1/#2/#3 sopra unità post-commit mostra ordine risoluzione. FX ray+popup+flash staggered 350ms per chiarezza visiva.',
      },
    ],
  },
  'invalid-action': {
    icon: '❌',
    title: 'Azione invalida',
    pages: [{ body: '' }], // dynamic via showTip(key, overrideMessage)
  },
  'sis-intent': {
    icon: '✊',
    title: 'Intento Sistema',
    pages: [
      {
        body: "L'icona ✊ sopra nemico = intento attacco prossimo turno (Slay the Spire pattern).\n\nHover per dettagli futuri (threat_preview payload ADR-04-18 backlog).",
      },
    ],
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

export function resetAllTips() {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(LS_PREFIX));
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

let currentEscHandler = null;
let modalPageIdx = 0;
let modalCurrentTip = null;

function getOrCreateModal() {
  let modal = document.getElementById('tip-modal-root');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'tip-modal-root';
  modal.className = 'tip-modal-root hidden';
  modal.innerHTML = `
    <div class="tip-modal-backdrop"></div>
    <div class="tip-modal" role="dialog" aria-modal="true" aria-labelledby="tip-modal-title">
      <div class="tip-modal-header">
        <span class="tip-modal-icon" aria-hidden="true"></span>
        <strong class="tip-modal-title" id="tip-modal-title"></strong>
        <span class="tip-modal-pageinfo" aria-hidden="true"></span>
      </div>
      <div class="tip-modal-body"></div>
      <div class="tip-modal-actions">
        <button class="tip-btn tip-btn-prev" type="button">◄ Indietro</button>
        <button class="tip-btn tip-btn-next" type="button">Avanti ►</button>
        <button class="tip-btn tip-btn-ok" type="button">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.tip-btn-ok').addEventListener('click', dismissModal);
  modal.querySelector('.tip-btn-next').addEventListener('click', nextPage);
  modal.querySelector('.tip-btn-prev').addEventListener('click', prevPage);
  modal.querySelector('.tip-modal-backdrop').addEventListener('click', dismissModal);
  return modal;
}

function renderCurrentPage() {
  const modal = document.getElementById('tip-modal-root');
  if (!modal || !modalCurrentTip) return;
  const pages = modalCurrentTip.pages || [{ body: '' }];
  const page = pages[modalPageIdx] || pages[0];
  const totalPages = pages.length;
  modal.querySelector('.tip-modal-icon').textContent = modalCurrentTip.icon || '';
  modal.querySelector('.tip-modal-title').textContent = modalCurrentTip.title || '';
  modal.querySelector('.tip-modal-body').textContent = page.body || '';
  const pageInfo = modal.querySelector('.tip-modal-pageinfo');
  if (totalPages > 1) {
    pageInfo.textContent = `${modalPageIdx + 1} / ${totalPages}`;
    pageInfo.style.display = '';
  } else {
    pageInfo.style.display = 'none';
  }
  const prevBtn = modal.querySelector('.tip-btn-prev');
  const nextBtn = modal.querySelector('.tip-btn-next');
  const okBtn = modal.querySelector('.tip-btn-ok');
  // Prev visible solo se not first page
  prevBtn.style.display = modalPageIdx > 0 ? '' : 'none';
  // Next visible solo se not last page
  nextBtn.style.display = modalPageIdx < totalPages - 1 ? '' : 'none';
  // OK visible solo su last page (o single-page)
  okBtn.style.display = modalPageIdx >= totalPages - 1 ? '' : 'none';
}

function nextPage() {
  if (!modalCurrentTip) return;
  const total = (modalCurrentTip.pages || []).length;
  if (modalPageIdx < total - 1) {
    modalPageIdx += 1;
    renderCurrentPage();
  }
}
function prevPage() {
  if (modalPageIdx > 0) {
    modalPageIdx -= 1;
    renderCurrentPage();
  }
}

function dismissModal() {
  const modal = document.getElementById('tip-modal-root');
  if (modal) modal.classList.add('hidden');
  if (currentEscHandler) {
    document.removeEventListener('keydown', currentEscHandler);
    currentEscHandler = null;
  }
  modalCurrentTip = null;
  modalPageIdx = 0;
}

// W8i — Core API. showTip(tipKey, overrideBody?).
// Se tip già seen → no-op silenzioso. Multi-page via pages array in catalog.
// overrideBody sostituisce page 0 body (usato per invalid-action dynamic message).
export function showTip(tipKey, overrideBody = null) {
  if (hasTipBeenShown(tipKey)) return;
  const meta = TIPS[tipKey];
  if (!meta) return;

  // Clone meta se override (non mutare catalog)
  let active = meta;
  if (overrideBody) {
    active = {
      ...meta,
      pages: [{ body: overrideBody }, ...(meta.pages ? meta.pages.slice(1) : [])],
    };
  }

  modalCurrentTip = active;
  modalPageIdx = 0;
  const modal = getOrCreateModal();
  modal.classList.remove('hidden');
  renderCurrentPage();
  markTipShown(tipKey);

  // ESC dismiss (anche con modal aperto)
  if (currentEscHandler) document.removeEventListener('keydown', currentEscHandler);
  currentEscHandler = (e) => {
    if (e.key === 'Escape') dismissModal();
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      const pages = modalCurrentTip?.pages || [];
      if (modalPageIdx < pages.length - 1) nextPage();
      else dismissModal();
    }
    if (e.key === 'ArrowLeft') prevPage();
  };
  document.addEventListener('keydown', currentEscHandler);
}

// W8h — Error recovery tip builder. Maps backend error → player-friendly tip.
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
