// M4 P0 Wave 2 — Help / Tutorial panel overlay.
// Toggle: '?' key o bottone top-right. Default OPEN prima sessione (onboarding),
// poi default CLOSED (localStorage key 'evo:help-seen').

const HELP_SEEN_KEY = 'evo:help-seen';

const HELP_HTML = `
  <div class="help-panel-card">
    <header class="help-panel-header">
      <h2>🦴 Come si gioca</h2>
      <button class="help-panel-close" id="help-close" title="Chiudi (ESC)">✕</button>
    </header>
    <div class="help-panel-body">
      <section>
        <h3>Obiettivo</h3>
        <p>Sopravvivi al Sistema. Azzera gli HP di tutti i nemici (rombi rossi) prima che il Sistema azzeri i tuoi (triangoli blu).</p>
      </section>

      <section>
        <h3>Controlli</h3>
        <ul>
          <li><b>Click unità tua</b> (blu) → seleziona</li>
          <li><b>Click cella vuota</b> → muovi (1 AP per cella)</li>
          <li><b>Click nemico</b> (rosso) → attacco base (1 AP)</li>
          <li><b>Click ability</b> (barra in basso) → seleziona skill, poi click target</li>
          <li><b>Fine turno</b> → passa turno al Sistema</li>
          <li><b>ESC</b> → annulla ability pending / azione pending</li>
          <li><b>?</b> → apri/chiudi questo pannello</li>
        </ul>
      </section>

      <section>
        <h3>Punteggi e risorse</h3>
        <ul>
          <li><b>HP</b> (barra sopra unità): vita. A 0 = KO.</li>
          <li><b>AP</b> (Action Points): budget azione per turno. Attaccare = 1 AP, muovere di N celle = N AP.</li>
          <li><b>PT</b> (Pressure): la barra in alto mostra la pressione del Sistema. Più sale, più il Sistema è aggressivo (tier Calm → Vigilant → Aggressive → Apex).</li>
        </ul>
      </section>

      <section>
        <h3>Icone unità</h3>
        <ul>
          <li><span class="help-icon help-icon-player">▲</span> <b>Triangolo blu</b> = tua unità</li>
          <li><span class="help-icon help-icon-sistema">◆</span> <b>Rombo rosso</b> = Sistema (nemico)</li>
          <li><span class="help-icon help-icon-intent">✊</span> <b>Pugno rosso sopra nemico</b> = intento attacco al prossimo turno</li>
          <li><span class="help-icon help-icon-warn">!</span> <b>Punto esclamativo arancio</b> = status panico</li>
          <li><span class="help-icon help-icon-stun">★</span> <b>Stella viola</b> = stordito</li>
          <li><span class="help-icon help-icon-bleed">☽</span> <b>Luna rosa</b> = sanguinamento</li>
        </ul>
      </section>

      <section>
        <h3>Suggerimenti tattici</h3>
        <ul>
          <li><b>Coordinati</b>: 2+ player stesso target stesso turno = combo focus-fire (+1 danno)</li>
          <li><b>Ability usano AP</b>: leggi il costo prima di spendere</li>
          <li><b>Terreno conta</b>: celle erba/pietra danno bonus difesa</li>
          <li><b>Sistema impara</b>: se sei aggressivo, diventerà aggressivo</li>
        </ul>
      </section>

      <footer class="help-panel-footer">
        <span>Premi <kbd>?</kbd> o <kbd>ESC</kbd> per chiudere.</span>
      </footer>
    </div>
  </div>
`;

let _rootEl = null;
let _isOpen = false;
let _keydownHandler = null;

function ensureRoot() {
  if (_rootEl) return _rootEl;
  _rootEl = document.createElement('div');
  _rootEl.id = 'help-panel';
  _rootEl.className = 'help-panel hidden';
  _rootEl.innerHTML = HELP_HTML;
  document.body.appendChild(_rootEl);
  _rootEl.addEventListener('click', (ev) => {
    if (ev.target === _rootEl) closeHelp();
  });
  _rootEl.querySelector('#help-close').addEventListener('click', closeHelp);
  return _rootEl;
}

export function openHelp() {
  const el = ensureRoot();
  el.classList.remove('hidden');
  _isOpen = true;
  try {
    localStorage.setItem(HELP_SEEN_KEY, '1');
  } catch {
    /* empty */
  }
}

export function closeHelp() {
  if (!_rootEl) return;
  _rootEl.classList.add('hidden');
  _isOpen = false;
}

export function toggleHelp() {
  if (_isOpen) closeHelp();
  else openHelp();
}

export function initHelpPanel(openBtnId = 'help-open') {
  ensureRoot();
  const btn = document.getElementById(openBtnId);
  if (btn) btn.addEventListener('click', toggleHelp);
  _keydownHandler = (e) => {
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
      e.preventDefault();
      toggleHelp();
    } else if (e.key === 'Escape' && _isOpen) {
      closeHelp();
    }
  };
  document.addEventListener('keydown', _keydownHandler);

  // First-run: apri help se mai visto
  try {
    if (!localStorage.getItem(HELP_SEEN_KEY)) {
      setTimeout(openHelp, 400);
    }
  } catch {
    /* empty */
  }
}

export function isHelpOpen() {
  return _isOpen;
}
