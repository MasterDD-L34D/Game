// W8L — Codex MVP minimal (in-game wiki + tip re-reader).
// Bundle B.3 (2026-04-27) — Tunic decipher Pages tab: blurred → clear via gameplay trigger.
// User feedback run5: "manca ancora il sistema Aliena o simile dove rileggere
// i tip e molto altro!". Minimal first-cut: 5 tab (Pagine / Tips / Glossario / Abilità /
// Statuses). A.L.I.E.N.A. full integration = Wave 9+ (vedi docs/planning/
// codex-in-game-aliena-integration.md).

import { showTip, hasTipBeenShown, resetAllTips } from './tips.js';
import { api } from './api.js';

// Bundle B.3 — current session_id holder (set by main.js on session start).
let _currentSessionId = null;
export function setCodexSessionId(sid) {
  _currentSessionId = sid;
}

// Sprint 3 §I (2026-04-27) — campaign_id holder for glyph progression.
let _currentCampaignId = null;
export function setCodexCampaignId(cid) {
  _currentCampaignId = cid;
}

// Glossario terms — canonical meccanica Evo-Tactics.
const GLOSSARIO = [
  {
    term: 'AP',
    full: 'Action Points',
    desc: 'Punti azione per turno. Ogni unità ha un budget AP. Muoversi costa 1 AP/cella, attaccare 1 AP, ability 1-3 AP.',
  },
  {
    term: 'HP',
    full: 'Hit Points',
    desc: 'Punti vita. Unità KO quando HP ≤ 0. Visibile come barra sopra unità + numeri.',
  },
  {
    term: 'DC',
    full: 'Difficulty Class',
    desc: 'Soglia difesa target. Attaccante tira d20 + mod, deve superare DC per colpire.',
  },
  {
    term: 'MoS',
    full: 'Margin of Success',
    desc: 'Differenza tra tiro attacco e DC. Più alto = più danni. MoS 0-2 = 1 dmg, 3-5 = 2 dmg, 6+ = crit 3 dmg.',
  },
  {
    term: 'd20',
    full: 'Die 20 faces',
    desc: 'Tirata casuale 1-20 per risolvere attacco. Naturale 20 = auto-hit + crit. Naturale 1 = auto-miss.',
  },
  {
    term: '+mod',
    full: 'Attack modifier',
    desc: 'Bonus stat-based (forza, destrezza, trait) sommato al d20. Valori tipici +1 a +5.',
  },
  {
    term: 'Initiative / ⚡',
    full: 'Reaction speed',
    desc: 'Velocità reazione. Determina ordine nel round simultaneo. Numero alto = agisce prima.',
  },
  {
    term: 'action_speed',
    full: 'Modificatore per tipo azione',
    desc: 'Parata +2, attacco 0, ability -1, movimento -2. Sommato a initiative per priorità round.',
  },
  {
    term: 'PP',
    full: 'Power Points',
    desc: 'Punti potenza. Accumulati combinando movimento + attacco (combo). Tier 2 ability richiedono PP ≥ 6.',
  },
  {
    term: 'PT',
    full: 'Pressure Tokens',
    desc: 'Token di pressione generati da attacchi. Spesi per parate o ability avanzate.',
  },
  {
    term: 'Round simultaneo',
    full: 'ADR-2026-04-15',
    desc: 'Tutti gli intent dichiarati si risolvono insieme ordinati per reaction_speed. NON turn-based classico.',
  },
  {
    term: 'Intent',
    full: 'Azione pianificata',
    desc: "Dichiarazione di azione futura. Si accumula in planning. Risolve quando premi 'Fine turno'. Multi-intent per unit supportato (W8k).",
  },
  {
    term: 'Focus fire',
    full: 'Combo co-op',
    desc: '2+ unità attaccano stesso nemico stesso round = +1 danno bonus. Incentiva pianificazione co-op.',
  },
  {
    term: 'Sistema',
    full: 'Antagonista AI',
    desc: 'Entità AI che controlla i nemici. Pressione da 0 (Calm) a 100+ (Apex). Tier più alto = più intents/round.',
  },
];

// Status effects breakdown per glossario quick reference.
const STATUSES_INFO = [
  {
    icon: '!',
    name: 'Panic',
    color: '#ff9800',
    effect: 'Penalità priority -2/intensity. Unità può sbagliare target. Dura N turni.',
  },
  {
    icon: '⚡',
    name: 'Rage',
    color: '#f44336',
    effect: 'Bonus attack_mod +1. Ma attacca automaticamente il più vicino (perde controllo).',
  },
  {
    icon: '★',
    name: 'Stun',
    color: '#9c27b0',
    effect: 'Salta prossimo turno (0 AP). Resistibile con mod mentali.',
  },
  {
    icon: '◎',
    name: 'Focus',
    color: '#03a9f4',
    effect: 'Bonus d20 + mod +2 per 1 attacco. Singolo uso, stackabile.',
  },
  {
    icon: '?',
    name: 'Confuse',
    color: '#ffc107',
    effect: 'Attacca random (alleato o nemico). Dura fino tiro salva.',
  },
  {
    icon: '☽',
    name: 'Bleed',
    color: '#e91e63',
    effect: 'Perdi 1 HP ogni turno. Curabile con heal ability o resist test.',
  },
  {
    icon: '✕',
    name: 'Fracture',
    color: '#795548',
    effect: 'Movimento dimezzato. Ability fisiche costano +1 AP.',
  },
  {
    icon: '↯',
    name: 'Sbilanciato',
    color: '#ffeb3b',
    effect: 'Perdita defense_mod -1. Attacchi subìti +1 danno. 1 turno.',
  },
  {
    icon: '⎯',
    name: 'Taunt',
    color: '#ffc107',
    effect: 'Forzato ad attaccare unità taunting. Ignora altri target.',
  },
  {
    icon: '◉',
    name: 'Aggro locked',
    color: '#ff5722',
    effect: 'Nemico fisso su target specifico finché knockout o debuff.',
  },
];

let isOpen = false;
let currentTab = 'pagine';

function getOrCreatePanel() {
  let panel = document.getElementById('codex-panel-root');
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'codex-panel-root';
  panel.className = 'codex-panel-root hidden';
  panel.innerHTML = `
    <div class="codex-panel-backdrop"></div>
    <div class="codex-panel" role="dialog" aria-modal="true" aria-labelledby="codex-panel-title">
      <div class="codex-panel-header">
        <span class="codex-panel-icon" aria-hidden="true">📖</span>
        <strong class="codex-panel-title" id="codex-panel-title">Codex — Guida rapida</strong>
        <button class="codex-close-btn" title="Chiudi (ESC)">✕</button>
      </div>
      <nav class="codex-tabs" role="tablist">
        <button class="codex-tab active" data-tab="pagine" role="tab">📜 Pagine</button>
        <button class="codex-tab" data-tab="specie" role="tab">🐾 Specie</button>
        <button class="codex-tab" data-tab="glifi" role="tab">⌬ Glifi</button>
        <button class="codex-tab" data-tab="tips" role="tab">💡 Tips</button>
        <button class="codex-tab" data-tab="glossario" role="tab">📖 Glossario</button>
        <button class="codex-tab" data-tab="abilita" role="tab">⚔ Abilità</button>
        <button class="codex-tab" data-tab="statuses" role="tab">🌀 Status</button>
      </nav>
      <div class="codex-panel-body">
        <div class="codex-tab-content" data-tab-content="pagine"></div>
        <div class="codex-tab-content hidden" data-tab-content="specie"></div>
        <div class="codex-tab-content hidden" data-tab-content="glifi"></div>
        <div class="codex-tab-content hidden" data-tab-content="tips"></div>
        <div class="codex-tab-content hidden" data-tab-content="glossario"></div>
        <div class="codex-tab-content hidden" data-tab-content="abilita"></div>
        <div class="codex-tab-content hidden" data-tab-content="statuses"></div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);
  panel.querySelector('.codex-close-btn').addEventListener('click', closeCodex);
  panel.querySelector('.codex-panel-backdrop').addEventListener('click', closeCodex);
  panel.querySelectorAll('.codex-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => switchTab(tabBtn.dataset.tab));
  });
  return panel;
}

function switchTab(tabName) {
  currentTab = tabName;
  const panel = document.getElementById('codex-panel-root');
  if (!panel) return;
  panel.querySelectorAll('.codex-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });
  panel.querySelectorAll('.codex-tab-content').forEach((c) => {
    c.classList.toggle('hidden', c.dataset.tabContent !== tabName);
  });
  renderTabContent(tabName);
}

function renderTabContent(tabName) {
  const container = document.querySelector(`[data-tab-content="${tabName}"]`);
  if (!container) return;
  if (tabName === 'pagine') renderPagineTab(container);
  else if (tabName === 'specie') renderSpecieTab(container);
  else if (tabName === 'glifi') renderGlifiTab(container);
  else if (tabName === 'tips') renderTipsTab(container);
  else if (tabName === 'glossario') renderGlossarioTab(container);
  else if (tabName === 'abilita') renderAbilitaTab(container);
  else if (tabName === 'statuses') renderStatusesTab(container);
}

// Sprint 3 §I (2026-04-27) — Glyph progression tab. Tunic decipher pattern:
// glyphs unlock via gameplay events (kill_species, enter_biome, ecc).
// Source: data/core/codex/tunic_glyphs.yaml + apps/backend/services/codex/tunicGlyphs.js.
function renderGlifiTab(el) {
  if (!_currentCampaignId) {
    el.innerHTML = `
      <p class="codex-intro">Avvia una campagna per consultare la lingua degli antichi (Glifi A.L.I.E.N.A.).</p>
    `;
    return;
  }
  el.innerHTML = `<p class="codex-intro">Caricamento glifi...</p>`;
  api
    .codexGlyphs(_currentCampaignId)
    .then((r) => {
      if (!r.ok) {
        el.innerHTML = `<p class="codex-intro">Errore caricamento glifi: ${r.data?.error || r.status}</p>`;
        return;
      }
      const glyphs = Array.isArray(r.data?.glyphs) ? r.data.glyphs : [];
      const counters = r.data?.counters || {};
      const unlocked = Number(r.data?.unlocked_count || 0);
      const total = Number(r.data?.total_count || glyphs.length);
      const counterRows = Object.entries(counters)
        .map(([ev, n]) => `<li><code>${ev}</code> · <strong>${n}</strong></li>`)
        .join('');
      el.innerHTML = `
        <p class="codex-intro">
          Lingua A.L.I.E.N.A. — ${unlocked}/${total} glifi decifrati.
          Ogni glifo si rivela accumulando eventi specifici (uccidi specie, entra biomi, applica trait).
        </p>
        ${
          counterRows
            ? `<details class="codex-glyph-counters" open>
                <summary><strong>Contatori campagna</strong></summary>
                <ul class="codex-glyph-counter-list">${counterRows}</ul>
              </details>`
            : ''
        }
        <ul class="codex-glyph-list">
          ${glyphs
            .map((g) => {
              const cls = g.unlocked ? 'codex-glyph unlocked' : 'codex-glyph locked';
              const sym = g.glyph || '?';
              const label = g.label || g.id;
              const prog = g.progress || {};
              const meaning = g.unlocked
                ? `<div class="codex-glyph-meaning">${g.description || ''}</div>`
                : `<div class="codex-glyph-hint">🔒 ${g.hint_unlock || ''} ${
                    prog.threshold
                      ? `<span class="codex-glyph-progress">(${prog.current || 0}/${prog.threshold})</span>`
                      : ''
                  }</div>`;
              return `<li class="${cls}" data-glyph-id="${g.id}">
                <div class="codex-glyph-header">
                  <span class="codex-glyph-symbol" aria-hidden="true">${g.unlocked ? sym : '███'}</span>
                  <strong class="codex-glyph-name">${label}</strong>
                </div>
                ${meaning}
              </li>`;
            })
            .join('')}
        </ul>
      `;
    })
    .catch((err) => {
      el.innerHTML = `<p class="codex-intro">Errore: ${err?.message || err}</p>`;
    });
}

// ─── SPEC-H — Specie tab (A.L.I.E.N.A. 6-dim diegetic Codex) ───────────────
// Renders the diegetic species entries from GET /api/v1/codex/entries. Container
// Hades-style: sidebar entry list (unlock-gated) + entry detail (6 accordion
// sections + Skiv-note footer). The "A.L.I.E.N.A." name is NOT player-facing
// (SPEC-H sez.7) — the tab is "Specie" and the section headings are diegetic.
// Coherence score stays secret (never served); HA5 proxy is a follow-up.

// 6 canonical dimensions, in order. Headings come from the entry data (diegetic).
const ALIENA_DIM_ORDER = [
  'A_ambiente',
  'L_linee_evolutive',
  'I_impianto',
  'E_ecologia',
  'N_norme_socio',
  'A_ancoraggio_narrativo',
];

// Per-player unlock state (SPEC-H sez.8 = private, client-side localStorage).
const CODEX_SEEN_PREFIX = 'evo:codex-seen-';

function isCodexEntryUnlocked(id) {
  try {
    const v = JSON.parse(localStorage.getItem(CODEX_SEEN_PREFIX + id) || 'null');
    return !!(v && v.unlocked);
  } catch {
    return false;
  }
}

// Mark a Codex entry discovered (QBN unlock). Called by gameplay events
// (encounter_completed / mating_success / ...). Wiring the triggers into the
// combat/debrief flow is a follow-up; this surface already reads the state.
export function markCodexEntrySeen(id, trigger = 'encounter_completed') {
  if (!id) return;
  try {
    localStorage.setItem(
      CODEX_SEEN_PREFIX + id,
      JSON.stringify({ unlocked: true, ts: new Date().toISOString(), trigger }),
    );
  } catch {
    /* localStorage unavailable — non-fatal */
  }
}

function escHtml(s) {
  return String(s == null ? '' : s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
}

// Specie tab state: which entry detail is open (null = sidebar list view).
let _specieSelectedId = null;
const _skivLastDraw = {}; // entry_id -> last drawn index (no-repeat)

function renderSpecieTab(el) {
  if (_specieSelectedId) renderSpecieDetail(el, _specieSelectedId);
  else renderSpecieList(el);
}

function renderSpecieList(el) {
  el.innerHTML = `<p class="codex-intro">Caricamento bestiario...</p>`;
  api
    .codexEntries()
    .then((r) => {
      if (!r.ok) {
        el.innerHTML = `<p class="codex-intro">Errore caricamento specie: ${escHtml(r.data?.error || r.status)}</p>`;
        return;
      }
      const entries = Array.isArray(r.data?.entries) ? r.data.entries : [];
      if (!entries.length) {
        el.innerHTML = `<p class="codex-intro">Nessuna specie nel bestiario.</p>`;
        return;
      }
      const withState = entries.map((e) => ({ ...e, _unlocked: isCodexEntryUnlocked(e.id) }));
      const unlockedCount = withState.filter((e) => e._unlocked).length;
      // Sorted: unlocked first, then locked — each alphabetical by display name.
      withState.sort((a, b) => {
        if (a._unlocked !== b._unlocked) return a._unlocked ? -1 : 1;
        return String(a.display_name_it).localeCompare(String(b.display_name_it));
      });
      el.innerHTML = `
        <p class="codex-intro">
          Bestiario — ${unlockedCount}/${entries.length} specie scoperte.
          Le specie ███████ si rivelano incontrandole sul campo.
        </p>
        <ul class="codex-specie-list">
          ${withState.map((e) => renderSpecieRow(e)).join('')}
        </ul>`;
      el.querySelectorAll('.codex-specie-row.unlocked').forEach((row) => {
        row.addEventListener('click', () => {
          _specieSelectedId = row.dataset.entryId;
          renderSpecieTab(el);
        });
      });
    })
    .catch((err) => {
      el.innerHTML = `<p class="codex-intro">Errore: ${escHtml(err?.message || err)}</p>`;
    });
}

function renderSpecieRow(e) {
  if (!e._unlocked) {
    return `<li class="codex-specie-row locked" data-entry-id="${escHtml(e.id)}">
      <div class="codex-specie-head"><span class="codex-specie-lock" aria-hidden="true">🔒</span>
        <strong class="codex-specie-name">??? <span class="codex-specie-type">${escHtml(e.type)}</span></strong></div>
      <div class="codex-specie-hint">${escHtml(e.unlock?.locked_preview || 'Incontra questa specie per sbloccarla.')}</div>
    </li>`;
  }
  return `<li class="codex-specie-row unlocked" data-entry-id="${escHtml(e.id)}" role="button" tabindex="0">
    <div class="codex-specie-head"><span class="codex-specie-lock unlocked" aria-hidden="true">🟢</span>
      <strong class="codex-specie-name">${escHtml(e.display_name_it)}</strong></div>
    <div class="codex-specie-sub">${escHtml(e.subtitle_it || e.display_name_en)}</div>
  </li>`;
}

function renderSpecieDetail(el, id) {
  el.innerHTML = `<p class="codex-intro">Caricamento...</p>`;
  api
    .codexEntry(id)
    .then((r) => {
      if (!r.ok || !r.data?.entry) {
        el.innerHTML = `<p class="codex-intro">Specie non trovata.</p>`;
        return;
      }
      const entry = r.data.entry;
      const dims = entry.aliena_dimensions || {};
      const sections = ALIENA_DIM_ORDER.filter((k) => dims[k])
        .map((k) => renderDimSection(dims[k]))
        .join('');
      el.innerHTML = `
        <div class="codex-actions-row">
          <button class="codex-btn" id="codex-specie-back">← Bestiario</button>
        </div>
        <div class="codex-specie-detail">
          <div class="codex-specie-detail-head">
            <strong class="codex-specie-title">${escHtml(entry.display_name_it)}</strong>
            <span class="codex-specie-en">${escHtml(entry.display_name_en || '')}</span>
            <div class="codex-specie-subtitle">${escHtml(entry.subtitle_it || '')}</div>
          </div>
          ${sections}
          ${renderSkivFooter(entry)}
        </div>`;
      el.querySelector('#codex-specie-back')?.addEventListener('click', () => {
        _specieSelectedId = null;
        renderSpecieTab(el);
      });
      wireSkivFooter(el, entry);
    })
    .catch((err) => {
      el.innerHTML = `<p class="codex-intro">Errore: ${escHtml(err?.message || err)}</p>`;
    });
}

function renderDimSection(dim) {
  const facts = dim.key_facts || dim.pressures || dim.senses;
  const factsHtml =
    Array.isArray(facts) && facts.length
      ? `<ul class="codex-dim-facts">${facts.map((f) => `<li>${escHtml(f)}</li>`).join('')}</ul>`
      : '';
  const impact = dim.game_impact
    ? `<div class="codex-dim-impact">${escHtml(dim.game_impact)}</div>`
    : '';
  return `<details class="codex-dim">
    <summary class="codex-dim-heading">${escHtml(dim.heading || '')}</summary>
    <div class="codex-dim-body">
      <p class="codex-dim-content">${escHtml(dim.content || '')}</p>
      ${factsHtml}
      ${impact}
    </div>
  </details>`;
}

// Skiv-instance note (diegetic, first-person). QBN-style no-repeat draw. Biome-
// aware pool selection is a follow-up — for now the default pool. NEVER renders
// stat/score: pure sensory lore (hades-schema rule).
function drawSkivNote(entry) {
  const note = entry.skiv_instance_note || {};
  const pools = note.voice_pool || {};
  const pool = Array.isArray(pools.default) ? pools.default : [];
  if (!pool.length) return '';
  let idx = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && idx === _skivLastDraw[entry.id]) idx = (idx + 1) % pool.length;
  _skivLastDraw[entry.id] = idx;
  return pool[idx];
}

function renderSkivFooter(entry) {
  const note = drawSkivNote(entry);
  if (!note) return '';
  return `<div class="codex-skiv-note">
    <div class="codex-skiv-text">${escHtml(note)}</div>
    <button class="codex-btn codex-skiv-redraw" title="Nuova nota">🎲 nuova nota</button>
  </div>`;
}

function wireSkivFooter(el, entry) {
  el.querySelector('.codex-skiv-redraw')?.addEventListener('click', () => {
    const note = drawSkivNote(entry);
    const textEl = el.querySelector('.codex-skiv-text');
    if (textEl && note) textEl.textContent = note;
  });
}

// Bundle B.3 — Pagine (decipher tab). Fetch da /api/v1/codex/pages?session_id=...
function renderPagineTab(el) {
  if (!_currentSessionId) {
    el.innerHTML = `<p class="codex-intro">Avvia una sessione per consultare le pagine A.L.I.E.N.A.</p>`;
    return;
  }
  el.innerHTML = `<p class="codex-intro">Caricamento pagine A.L.I.E.N.A....</p>`;
  api
    .codexPages(_currentSessionId)
    .then((r) => {
      if (!r.ok) {
        el.innerHTML = `<p class="codex-intro">Errore caricamento codex: ${r.data?.error || r.status}</p>`;
        return;
      }
      const pages = Array.isArray(r.data?.pages) ? r.data.pages : [];
      const total = r.data?.total || 0;
      const dec = r.data?.deciphered_count || 0;
      el.innerHTML = `
        <p class="codex-intro">
          Archivio enciclopedico A.L.I.E.N.A. — ${dec}/${total} pagine decifrate.
          Le pagine ███████ si rivelano attraverso il gameplay (entra biomi, uccidi specie, applica trait).
        </p>
        <ul class="codex-pages-list">
          ${pages
            .map((p) => {
              const cls = p.deciphered ? 'codex-page deciphered' : 'codex-page blurred';
              const hint = p.deciphered
                ? ''
                : `<div class="codex-page-hint">🔒 Decifra: ${p.decipher_hint || '(trigger sconosciuto)'}</div>`;
              return `<li class="${cls}" data-page-id="${p.id}">
                <div class="codex-page-title"><strong>${p.title || p.id}</strong>
                  <span class="codex-page-cat">${p.category || ''}</span></div>
                <pre class="codex-page-content">${p.content || ''}</pre>
                ${hint}
              </li>`;
            })
            .join('')}
        </ul>
      `;
    })
    .catch((err) => {
      el.innerHTML = `<p class="codex-intro">Errore: ${err?.message || err}</p>`;
    });
}

function renderTipsTab(el) {
  // Nota: usiamo TIP_KEYS mirror per non dipendere internal catalog.
  const TIP_LIST = [
    { key: 'select-unit', title: '👆 Seleziona una tua unità' },
    { key: 'range-overlay', title: '🎯 Leggere il canvas' },
    { key: 'first-move', title: '➡️ Hai dichiarato un movimento' },
    { key: 'first-attack', title: '⚔️ Hai dichiarato un attacco' },
    { key: 'first-ability', title: '✨ Ability selezionata' },
    { key: 'intent-declared', title: '💾 Pianifichi prima, agisci dopo' },
    { key: 'round-resolve', title: '⚔️ Round simultaneo — chi agisce prima?' },
    { key: 'sis-intent', title: '✊ Cosa farà il nemico?' },
  ];
  el.innerHTML = `
    <p class="codex-intro">I tip contestuali appaiono la prima volta che fai un'azione. Qui puoi rileggerli tutti o resettare lo stato.</p>
    <div class="codex-actions-row">
      <button class="codex-btn" id="codex-reset-tips">🔄 Resetta TUTTI i tip (li rivedrai)</button>
    </div>
    <ul class="codex-tip-list">
      ${TIP_LIST.map((t) => {
        const seen = hasTipBeenShown(t.key);
        return `<li class="codex-tip-item ${seen ? 'seen' : 'unseen'}" data-tip-key="${t.key}">
          <span class="codex-tip-status" aria-hidden="true">${seen ? '✓' : '○'}</span>
          <span class="codex-tip-title">${t.title}</span>
          <button class="codex-btn codex-tip-reread">Rileggi</button>
        </li>`;
      }).join('')}
    </ul>
  `;
  el.querySelector('#codex-reset-tips')?.addEventListener('click', () => {
    resetAllTips();
    renderTabContent('tips');
    const count = TIP_LIST.length;
    alert(`${count} tip resettati. Ri-triggeranno al prossimo uso delle feature.`);
  });
  el.querySelectorAll('.codex-tip-item').forEach((item) => {
    item.querySelector('.codex-tip-reread')?.addEventListener('click', () => {
      const tipKey = item.dataset.tipKey;
      // Reset seen flag solo per questo tip + re-show
      try {
        localStorage.removeItem('evo:tip-' + tipKey);
      } catch {
        /* ignore */
      }
      closeCodex();
      setTimeout(() => showTip(tipKey), 200);
    });
  });
}

function renderGlossarioTab(el) {
  el.innerHTML = `
    <p class="codex-intro">Glossario termini meccanica Evo-Tactics. Cerca acronimi e meccaniche core.</p>
    <dl class="codex-glossario">
      ${GLOSSARIO.map(
        (g) => `
        <dt><strong>${g.term}</strong> <span class="codex-term-full">(${g.full})</span></dt>
        <dd>${g.desc}</dd>
      `,
      ).join('')}
    </dl>
  `;
}

function renderAbilitaTab(el) {
  el.innerHTML = `<p class="codex-intro">Caricamento abilità da /api/jobs...</p>`;
  fetch('/api/jobs')
    .then((r) => r.json())
    .then((data) => {
      const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
      if (jobs.length === 0) {
        el.innerHTML = '<p class="codex-intro">Nessun job disponibile.</p>';
        return;
      }
      el.innerHTML = `
        <p class="codex-intro">Abilità per ruolo (7 job canonical). Ogni job ha 3 abilità signature sbloccate progressivamente.</p>
        ${jobs
          .map((j) => {
            const abilities = Array.isArray(j.ability_ids)
              ? j.ability_ids
              : Array.isArray(j.abilities)
                ? j.abilities.map((a) => (typeof a === 'string' ? a : a.ability_id))
                : [];
            const labelIt = j.label || j.label_it || j.id;
            return `<details class="codex-job" open>
              <summary><strong>${labelIt}</strong> <span class="codex-job-role">${j.role || ''}</span></summary>
              <p class="codex-job-mechanic">${j.signature_mechanic || ''}</p>
              <ul class="codex-ability-list">
                ${abilities.map((ab) => `<li><code>${String(ab).replace(/_/g, ' ')}</code></li>`).join('')}
              </ul>
            </details>`;
          })
          .join('')}
      `;
    })
    .catch(() => {
      el.innerHTML = '<p class="codex-intro">Errore caricamento job. Backend offline?</p>';
    });
}

function renderStatusesTab(el) {
  el.innerHTML = `
    <p class="codex-intro">Status effect che possono colpire tue unità o nemici durante il combattimento.</p>
    <ul class="codex-status-list">
      ${STATUSES_INFO.map(
        (s) => `
        <li>
          <span class="codex-status-chip" style="background:${s.color};color:#000">${s.icon} ${s.name}</span>
          <span class="codex-status-desc">${s.effect}</span>
        </li>
      `,
      ).join('')}
    </ul>
  `;
}

export function openCodex() {
  if (isOpen) return;
  const panel = getOrCreatePanel();
  panel.classList.remove('hidden');
  isOpen = true;
  renderTabContent(currentTab);
  // ESC dismiss
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeCodex();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

export function closeCodex() {
  const panel = document.getElementById('codex-panel-root');
  if (panel) panel.classList.add('hidden');
  isOpen = false;
}

export function toggleCodex() {
  if (isOpen) closeCodex();
  else openCodex();
}
