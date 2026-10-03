// W8h/8i/8j — Contextual first-time tip modal con spotlight highlight.
// Evo-Tactics onboarding: learn-by-doing + pointer a elementi concreti.
//
// W8j: user feedback "tip poco chiari lato umano, quello di cui parlo non viene
// evidenziato". Fix: ogni page dichiara `highlights: [selector]` → elementi target
// glow+pulse durante modal open. Copy riscritta conversational, meno jargon.

const LS_PREFIX = 'evo:tip-';
const HIGHLIGHT_CLASS = 'tip-highlight-target';

// Tip catalog — ogni page ha: body (human-friendly) + highlights (CSS selectors
// degli elementi reali cui si riferisce il testo). Se highlights missing = nessun
// target evidenziato.
const TIPS = {
  'select-unit': {
    icon: '👆',
    title: 'Seleziona una tua unità',
    pages: [
      {
        body: "Benvenuto! Nella colonna a destra sotto 'I tuoi PG' ci sono le tue unità (bordo blu spesso). Clicca una per selezionarla.\n\nLa card lampeggiante ora è quella selezionata: appariranno dati sul canvas per aiutarti a muoverti e attaccare.",
        highlights: ['#units li.player'],
      },
      {
        body: "Ogni unità ha icone ⚔ (attacchi speciali) sotto la sua card.\n\nPuoi anche usarle dalla barra in basso. Ogni azione che fai si chiama 'intento': non succede subito, si accumula e tutti insieme si risolvono quando clicchi 'Fine turno'.",
        highlights: ['.unit-abilities', '#end-turn'],
      },
    ],
  },
  'first-move': {
    icon: '➡️',
    title: 'Hai dichiarato un movimento',
    pages: [
      {
        body: "Bravo! Hai detto all'unità dove andare. Vedi il badge verde '✓ move' con il numero di ordine nella sua card.\n\nOgni casella costa 1 AP (punti azione). La distanza è mostrata dai numeri bianchi sulle caselle blu del canvas.",
        highlights: ['.intent-badge.declared', '.intent-row'],
      },
      {
        body: "Puoi cambiare idea: clicca un'altra casella per sovrascrivere, oppure il pulsante ✕ accanto al badge per annullare solo questa unità.\n\nQuando tutti i tuoi PG sono pronti, premi 'Fine turno' (o il tasto Invio).",
        highlights: ['.intent-cancel', '#end-turn'],
      },
    ],
  },
  'first-attack': {
    icon: '⚔️',
    title: 'Hai dichiarato un attacco',
    pages: [
      {
        body: "L'unità attaccherà il nemico quando risolvi il round. Costo: 1 AP.\n\nCome funziona: si tira un d20 (1-20) + modificatore vs la difesa del nemico. Se colpisci, i danni dipendono da quanto hai superato la difesa.",
        highlights: ['.intent-badge.declared'],
      },
      {
        body: "Tip co-op: se DUE unità attaccano lo STESSO nemico nello stesso round, ottengono +1 danno bonus (focus fire).\n\nPremi 'Fine turno' (o Invio) per risolvere tutto insieme.",
        highlights: ['#end-turn'],
      },
    ],
  },
  'first-ability': {
    icon: '✨',
    title: 'Ability selezionata',
    pages: [
      {
        body: "Hai scelto un'abilità speciale. Ora clicca il bersaglio: un nemico, un alleato, o una casella, a seconda dell'abilità.\n\nIl costo AP è scritto sulla chip gialla (⚔).",
        highlights: ['#abilities', '.unit-abilities'],
      },
      {
        body: "Se cambi idea: premi ESC per annullare. Oppure clicca un'altra abilità per cambiare scelta.\n\nLe abilità più potenti richiedono PP (punti potenza) guadagnati combinando movimenti + attacchi.",
        highlights: [],
      },
    ],
  },
  'range-overlay': {
    icon: '🎯',
    title: 'Leggere il canvas',
    pages: [
      {
        body: "Quando selezioni un'unità, appaiono colori sulla griglia:\n\n• BLU = caselle dove puoi muoverti. Il numero bianco dice quanti AP costa.\n• ROSSO = nemici nel raggio d'attacco.\n\nSe non ci sono caselle rosse, il nemico è troppo lontano — devi avvicinarti prima.",
        highlights: ['canvas#grid'],
      },
    ],
  },
  'intent-declared': {
    icon: '💾',
    title: 'Pianifichi prima, agisci dopo',
    pages: [
      {
        body: "Tutte le azioni dei tuoi PG si ACCUMULANO come 'intenti'. Non succede niente finché non clicchi 'Fine turno'.\n\n✕ annulla UN SOLO intent. ESC annulla TUTTI. Re-click stessa azione = sovrascrivi (utile se cambi idea).",
        highlights: ['#end-turn', '.intent-row'],
      },
    ],
  },
  'round-resolve': {
    icon: '⚔️',
    title: 'Round simultaneo — chi agisce prima?',
    pages: [
      {
        body: "Quando premi 'Fine turno', TUTTI gli intenti (tuoi + del Sistema) si risolvono insieme.\n\nL'ordine dipende dalla 'velocità di reazione' (icona ⚡ sulla card unità): numero più alto = agisce prima. Le azioni veloci (parata +2, attacco 0) contano più delle lente (movimento -2).",
        highlights: ['#units li .unit-stats span', '#end-turn'],
      },
      {
        body: "Durante la risoluzione vedrai:\n\n• Un overlay '⚔ ROUND N · X azioni simultanee'\n• Numeri #1/#2/#3 sopra le unità (ordine risoluzione)\n• Effetti staggerati: ray attacco → danno popup → flash",
        highlights: [],
      },
    ],
  },
  'invalid-action': {
    icon: '❌',
    title: 'Azione non valida',
    pages: [{ body: '', highlights: [] }], // dynamic body via showTip(key, overrideBody)
  },
  'sis-intent': {
    icon: '✊',
    title: 'Cosa farà il nemico?',
    pages: [
      {
        body: "L'icona ✊ sopra un nemico = sta per attaccarti al prossimo turno.\n\nPassa il mouse sul nemico per vedere dettagli (quale unità colpirà, stima danni). Usa questa info per pianificare difesa o parata.",
        highlights: ['canvas#grid'],
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
      <div class="tip-modal-hint">💡 Elementi evidenziati sulla schermata si riferiscono a questo tip</div>
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

// W8j — Clear all highlight markers from previous page/tip.
function clearHighlights() {
  document.querySelectorAll('.' + HIGHLIGHT_CLASS).forEach((el) => {
    el.classList.remove(HIGHLIGHT_CLASS);
  });
}

// W8j — Apply .tip-highlight-target class to elements matching selectors.
// CSS glow + pulse + z-index above backdrop makes target visually obvious.
function applyHighlights(selectors) {
  clearHighlights();
  if (!Array.isArray(selectors)) return;
  for (const sel of selectors) {
    try {
      document.querySelectorAll(sel).forEach((el) => el.classList.add(HIGHLIGHT_CLASS));
    } catch {
      /* invalid selector, skip */
    }
  }
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
  prevBtn.style.display = modalPageIdx > 0 ? '' : 'none';
  nextBtn.style.display = modalPageIdx < totalPages - 1 ? '' : 'none';
  okBtn.style.display = modalPageIdx >= totalPages - 1 ? '' : 'none';
  // W8j — highlight elements target di questa page
  applyHighlights(page.highlights || []);
  // Show/hide hint banner based on highlights presence
  const hintEl = modal.querySelector('.tip-modal-hint');
  if (hintEl) hintEl.style.display = page.highlights && page.highlights.length > 0 ? '' : 'none';
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
  clearHighlights();
  modalCurrentTip = null;
  modalPageIdx = 0;
}

export function showTip(tipKey, overrideBody = null) {
  if (hasTipBeenShown(tipKey)) return;
  const meta = TIPS[tipKey];
  if (!meta) return;

  let active = meta;
  if (overrideBody) {
    const origPages = meta.pages || [{ body: '' }];
    active = {
      ...meta,
      pages: [{ ...origPages[0], body: overrideBody }, ...origPages.slice(1)],
    };
  }

  modalCurrentTip = active;
  modalPageIdx = 0;
  const modal = getOrCreateModal();
  modal.classList.remove('hidden');
  renderCurrentPage();
  markTipShown(tipKey);

  if (currentEscHandler) document.removeEventListener('keydown', currentEscHandler);
  currentEscHandler = (e) => {
    if (e.key === 'Escape') dismissModal();
    if (e.key === 'Enter' || e.key === 'ArrowRight') {
      const pages = modalCurrentTip?.pages || [];
      if (modalPageIdx < pages.length - 1) nextPage();
      else dismissModal();
    }
    if (e.key === 'ArrowLeft') prevPage();
  };
  document.addEventListener('keydown', currentEscHandler);
}

// Error recovery (W8h, preserved).
export function buildRecoveryTipMessage(errorText) {
  if (!errorText) return null;
  const lower = String(errorText).toLowerCase();
  const map = [
    {
      match: /range|too far|distanza|lontano/,
      msg: "📍 Troppo lontano! Muovi prima l'unità più vicina al bersaglio. I numeri bianchi sulle caselle blu ti dicono quanti AP costa arrivare.",
    },
    {
      match: /ap|azioni esaurite|insufficient/,
      msg: '⚡ Questa unità ha finito le azioni (AP). Usa un altro PG oppure clicca "Fine turno" per concludere.',
    },
    {
      match: /target|bersaglio|invalid/,
      msg: '🎯 Bersaglio non valido. Per attaccare, clicca un nemico (card rossa nella colonna) che sia nel raggio (caselle rosse sul canvas).',
    },
    {
      match: /occupied|occupata|blocker|blocked/,
      msg: "🧍 La casella è già occupata da un'altra unità. Scegli una casella blu vuota.",
    },
    {
      match: /dead|ko|hp 0/,
      msg: "☠ Questa unità è KO (HP 0). Seleziona un'altra unità ancora viva.",
    },
  ];
  for (const rule of map) {
    if (rule.match.test(lower)) return rule.msg;
  }
  return null;
}
