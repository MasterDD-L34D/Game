// M11 onboarding overlay — primo-accesso tour per player + host share hint.
// Dismissible. Persistenza via localStorage. No deps esterne.

const STORAGE_KEY = 'lobby_onboarding_v1_seen';

function seen() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // noop
  }
}

const PLAYER_STEPS = [
  {
    title: 'Benvenuto!',
    body: 'Sei in una partita co-op. Il TV del tuo amico host mostra la mappa; tu controlli uno dei personaggi dal tuo telefono.',
  },
  {
    title: 'Componi intent',
    body: 'Quando inizia la sessione, qui sotto vedi un form. Scegli il tuo PG, poi l\'azione (attack, move, defend) e il target. Tocca "Invia intent".',
  },
  {
    title: 'Il TV risolve il round',
    body: 'Dopo che tutti hanno inviato, il TV mostra il risultato del round. Puoi scrollare lo state JSON per i dettagli.',
  },
];

export function renderPlayerOnboarding({ force = false } = {}) {
  if (typeof document === 'undefined') return null;
  if (!force && seen()) return null;
  if (document.getElementById('lobby-onboarding')) return null;

  const root = document.createElement('div');
  root.id = 'lobby-onboarding';
  root.className = 'lobby-onboarding';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'lobby-onboarding-title');

  let step = 0;
  const render = () => {
    const s = PLAYER_STEPS[step];
    root.innerHTML = `
      <div class="lobby-onboarding-card">
        <div class="lobby-onboarding-progress">${step + 1} / ${PLAYER_STEPS.length}</div>
        <h2 id="lobby-onboarding-title">${s.title}</h2>
        <p>${s.body}</p>
        <div class="lobby-onboarding-actions">
          <button type="button" class="lobby-onboarding-skip">Salta</button>
          <button type="button" class="lobby-onboarding-prev" ${step === 0 ? 'disabled' : ''}>Indietro</button>
          <button type="button" class="lobby-onboarding-next">
            ${step === PLAYER_STEPS.length - 1 ? 'Inizia' : 'Avanti'}
          </button>
        </div>
      </div>
    `;
    root.querySelector('.lobby-onboarding-skip').addEventListener('click', close);
    root.querySelector('.lobby-onboarding-prev').addEventListener('click', () => {
      if (step > 0) {
        step -= 1;
        render();
      }
    });
    root.querySelector('.lobby-onboarding-next').addEventListener('click', () => {
      if (step < PLAYER_STEPS.length - 1) {
        step += 1;
        render();
      } else {
        close();
      }
    });
  };

  const close = () => {
    markSeen();
    root.remove();
  };

  document.body.appendChild(root);
  render();
  return root;
}

export function renderHostShareHint({ session, container }) {
  if (typeof document === 'undefined') return null;
  if (!session?.code) return null;
  const parent = container || document.body;
  if (parent.querySelector('#lobby-host-share-hint')) return null;

  const hint = document.createElement('div');
  hint.id = 'lobby-host-share-hint';
  hint.className = 'lobby-host-share-hint';
  const shareUrl = buildShareUrl(session.code);
  // 2026-04-29 master-dd request: QR code per join rapido smartphone.
  const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(shareUrl)}`;
  hint.innerHTML = `
    <div class="lobby-host-share-card">
      <div class="lobby-host-share-title">📢 Condividi con i tuoi amici</div>
      <div class="lobby-host-share-code" title="Codice stanza">${session.code}</div>
      <div class="lobby-host-share-qr">
        <img src="${qrApi}" alt="QR code stanza" width="180" height="180" />
        <div class="lobby-host-share-qr-hint">Scansiona per join rapido</div>
      </div>
      <div class="lobby-host-share-row">
        <input type="text" readonly value="${shareUrl}" class="lobby-host-share-url" />
        <button type="button" class="lobby-host-share-copy">Copia</button>
      </div>
      <div class="lobby-host-share-status" aria-live="polite"></div>
      <div class="lobby-host-share-hint-body">
        ⚠ Serve almeno 1 amico connesso prima di cliccare "Nuova sessione"
        (altrimenti flow co-op skippato → char creation + world setup non appaiono).
        L'indicatore scompare quando qualcuno entra.
      </div>
    </div>
  `;
  parent.appendChild(hint);

  const input = hint.querySelector('.lobby-host-share-url');
  const status = hint.querySelector('.lobby-host-share-status');
  hint.querySelector('.lobby-host-share-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      status.textContent = '✓ Copiato';
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    } catch {
      input.select();
      status.textContent = 'Seleziona e Ctrl+C';
    }
  });
  // Self-dismissing poll: ogni 1s controlla roster DOM, se contiene player
  // non-host dismiss hint. Salvagente contro race event-driven dismiss.
  const pollId = setInterval(() => {
    const currentHint = document.getElementById('lobby-host-share-hint');
    if (!currentHint) {
      clearInterval(pollId);
      return;
    }
    const rosterList = document.getElementById('lobby-host-roster-list');
    if (!rosterList) return;
    const items = rosterList.querySelectorAll('li:not(.lobby-host-roster-empty)');
    let hasPlayer = false;
    items.forEach((li) => {
      const roleSpan = li.querySelector('.role');
      if (roleSpan && !roleSpan.classList.contains('host')) hasPlayer = true;
    });
    if (hasPlayer) {
      dismissHostShareHint();
      clearInterval(pollId);
    }
  }, 1000);
  return hint;
}

export function dismissHostShareHint() {
  const hint = document.getElementById('lobby-host-share-hint');
  if (hint) hint.remove();
}

function buildShareUrl(code) {
  if (typeof window === 'undefined' || !window.location) return `?code=${code}`;
  const { origin, pathname } = window.location;
  const dir = pathname.replace(/\/[^/]*$/, '/');
  return `${origin}${dir}lobby.html?code=${encodeURIComponent(code)}`;
}

// Export utils for tests
export const __testing = { seen, markSeen, buildShareUrl, STORAGE_KEY };
