// M4 P0 Wave 2 — Help / Tutorial panel overlay.
// Toggle: '?' key o bottone top-right. Default OPEN prima sessione (onboarding),
// poi default CLOSED (localStorage key 'evo:help-seen').

import { t } from './i18n.js';

const HELP_SEEN_KEY = 'evo:help-seen';

const getHelpHtml = () => `
  <div class="help-panel-card">
    <header class="help-panel-header">
      <h2>${t('help.title')}</h2>
      <button class="help-panel-close" id="help-close" title="${t('help.close_tooltip')}">✕</button>
    </header>
    <div class="help-panel-body">
      <section>
        <h3>${t('help.section_objective')}</h3>
        <p>${t('help.objective_desc')}</p>
      </section>

      <section>
        <h3>${t('help.section_controls')}</h3>
        <ul>
          <li>${t('help.ctrl_select')}</li>
          <li>${t('help.ctrl_move')}</li>
          <li>${t('help.ctrl_attack')}</li>
          <li>${t('help.ctrl_ability')}</li>
          <li>${t('help.ctrl_end')}</li>
          <li>${t('help.ctrl_cancel')}</li>
          <li>${t('help.ctrl_help')}</li>
        </ul>
      </section>

      <section>
        <h3>${t('help.section_resources')}</h3>
        <ul>
          <li>${t('help.res_hp')}</li>
          <li>${t('help.res_ap')}</li>
          <li>${t('help.res_pt')}</li>
        </ul>
      </section>

      <section>
        <h3>${t('help.section_icons')}</h3>
        <ul>
          <li><span class="help-icon help-icon-player">▲</span> ${t('help.icon_player')}</li>
          <li><span class="help-icon help-icon-sistema">◆</span> ${t('help.icon_system')}</li>
          <li><span class="help-icon help-icon-intent">✊</span> ${t('help.icon_intent')}</li>
          <li><span class="help-icon help-icon-warn">!</span> ${t('help.icon_warn')}</li>
          <li><span class="help-icon help-icon-stun">★</span> ${t('help.icon_stun')}</li>
          <li><span class="help-icon help-icon-bleed">☽</span> ${t('help.icon_bleed')}</li>
        </ul>
      </section>

      <section>
        <h3>${t('help.section_tactics')}</h3>
        <ul>
          <li>${t('help.tac_coord')}</li>
          <li>${t('help.tac_ap')}</li>
          <li>${t('help.tac_terrain')}</li>
          <li>${t('help.tac_system')}</li>
        </ul>
      </section>

      <footer class="help-panel-footer">
        <span>${t('help.footer')}</span>
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
  _rootEl.innerHTML = getHelpHtml();
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
