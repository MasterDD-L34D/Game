// CAP-14b — Onboarding Phase V2: L'Impronta (4 player, body-part axes).
//
// Port del mockup CAP-13 (prototypes/imprint-v2/index.html, UX validato 🟢)
// in modulo Vite consumabile da main.js dietro feature flag `?imprint_v2=1`.
//
// Wire backend:
//   - POST /api/coop/imprint/start   (host)         CAP-15b
//   - POST /api/coop/imprint/choice  (player)       CAP-15b
//   - GET  /api/coop/imprint/state                  CAP-15b (polling fallback)
//   - WS event 'phase_change'                       CAP-15 (trigger refresh)
//
// API:
//   openImprintPanelV2({ code, playerId, playerToken, hostToken, role,
//                        client?, baseUrl?, autoStart? }) → Promise<biome>
//
// Role assignment:
//   - host: vede TV view + opzionale start button
//   - player slot: 'p1'..'p4' decide quale axis (locomotion/offense/defense/senses)
//
// Quando 4/4 axes coperti, GET /imprint/state risolve `biome` non-null e la
// promise risolve. Se l'utente preme "Continua" sull'epilogue, return immediato.

'use strict';

const PHONE_CONFIG = {
  p1: {
    name: 'Player 1',
    bodyPart: 'Le tue zampe',
    question: 'Veloci o silenziose?',
    field: 'locomotion',
    options: [
      { value: 'VELOCE', label: 'VELOCE', desc: 'Movimento ampio, hit-and-run' },
      { value: 'SILENZIOSA', label: 'SILENZIOSA', desc: 'Stealth, ambush' },
    ],
  },
  p2: {
    name: 'Player 2',
    bodyPart: 'La tua mascella',
    question: 'Profonda o rapida?',
    field: 'offense',
    options: [
      { value: 'PROFONDA', label: 'PROFONDA', desc: 'Singolo morso devastante' },
      { value: 'RAPIDA', label: 'RAPIDA', desc: 'Attacchi multipli, bleeding' },
    ],
  },
  p3: {
    name: 'Player 3',
    bodyPart: 'La tua pelle',
    question: 'Dura o flessibile?',
    field: 'defense',
    options: [
      { value: 'DURA', label: 'DURA', desc: 'Armatura naturale, lentezza' },
      { value: 'FLESSIBILE', label: 'FLESSIBILE', desc: 'Evasione, parry' },
    ],
  },
  p4: {
    name: 'Player 4',
    bodyPart: 'I tuoi occhi',
    question: 'Lontano o acuto?',
    field: 'senses',
    options: [
      { value: 'LONTANO', label: 'LONTANO', desc: 'Range visivo amplio' },
      { value: 'ACUTO', label: 'ACUTO', desc: 'Dettaglio, rilevamento traps' },
    ],
  },
};

const PLAYER_EMOJI = { p1: '🦅', p2: '🦊', p3: '🦎', p4: '🦉' };
const PLAYER_PART_LABEL = { p1: 'ZAMPE', p2: 'MASCELLA', p3: 'PELLE', p4: 'OCCHI' };

const BIOME_NAMES = {
  savana: 'La Savana',
  savana_arida_dura: 'La Savana Arida (terreno indurito)',
  savana_aperta_orizzonte: "La Savana dell'Orizzonte (visibilità estesa)",
  badlands: 'Le Pianure Aride',
  badlands_pietrosi: 'Le Pianure Pietrose',
  badlands_orizzonte: "Le Pianure dell'Orizzonte",
  caverna_risonante: 'La Caverna Risonante',
  caverna_silenziosa: 'La Caverna Silenziosa',
  caverna_profonda_eco: "La Caverna dell'Eco Profonda",
  rovine_planari: 'Le Rovine Planari',
  rovine_sussurranti: 'Le Rovine Sussurranti',
  palude_tossica: 'La Palude Tossica',
  palude_indurita: 'La Palude Indurita',
  canopia_ionica: 'La Canopia Ionica',
  reef_luminescente: 'Il Reef Luminescente',
};

const FOODWEB_BY_BIOME = {
  savana: ['🦬 Erbivori', '🦁 Predatori', '🪲 Insetti', '🌾 Vegetali'],
  badlands: ['🦂 Aracnidi', '🐍 Rettili', '🦎 Lucertole', '🪨 Minerali bio'],
  caverna_risonante: ['🦇 Pipistrelli', '🪱 Vermi luminescenti', '🍄 Funghi', '💧 Acque ferme'],
  rovine_planari: ['👻 Echi spettrali', '🪲 Coleotteri', '🌿 Muschi', '⚙️ Reliquie'],
  palude_tossica: ['🐸 Anfibi', '🦟 Insetti', '🪴 Vegetazione tossica', '💀 Decompositori'],
  canopia_ionica: ['🦜 Aviani', '🐒 Arboreali', '🌺 Fiori carnivori', '☁️ Spore galleggianti'],
  reef_luminescente: ['🐠 Pesci', '🪸 Coralli', '🦑 Cefalopodi', '✨ Plankton'],
};

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null || c === false) continue;
    if (typeof c === 'string') node.appendChild(document.createTextNode(c));
    else node.appendChild(c);
  }
  return node;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  return { ok: res.ok, status: res.status, data };
}

async function getJson(url) {
  const res = await fetch(url);
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  return { ok: res.ok, status: res.status, data };
}

/**
 * Open the imprint v2 phase overlay.
 *
 * @param {object} params
 * @param {string} params.code - lobby code
 * @param {string} params.playerId - player id (or host id when role==='host')
 * @param {string} [params.playerToken] - player token (required if role !== 'host')
 * @param {string} [params.hostToken] - host token (required if role === 'host')
 * @param {'host'|'p1'|'p2'|'p3'|'p4'} params.role
 * @param {object} [params.client] - LobbyClient for WS phase_change subscription
 * @param {string} [params.baseUrl] - REST base, default ''
 * @param {boolean} [params.autoStart] - host: POST /imprint/start automatically
 * @returns {Promise<{biome_id, base_biome_id, applied_modulations}>}
 */
export async function openImprintPanelV2({
  code,
  playerId,
  playerToken,
  hostToken,
  role,
  client = null,
  baseUrl = '',
  autoStart = true,
} = {}) {
  if (!code) throw new Error('openImprintPanelV2: code required');
  if (!role) throw new Error('openImprintPanelV2: role required');
  const isHost = role === 'host';
  const config = isHost ? null : PHONE_CONFIG[role];
  if (!isHost && !config) throw new Error(`openImprintPanelV2: invalid role ${role}`);

  // ── Build overlay ─────────────────────────────────────────────────
  const overlay = el('div', {
    class: 'imprint-v2-overlay',
    role: 'dialog',
    'aria-modal': 'true',
  });
  const stage = el('div', { class: `imprint-v2-stage ${isHost ? 'tv-view' : 'phone-view'}` });
  if (!isHost) stage.classList.add(`color-${role}`);
  overlay.appendChild(stage);
  document.body.appendChild(overlay);

  let resolved = null;
  let pollTimer = null;
  let unsubPhase = null;
  let lastState = null;

  function cleanup() {
    if (pollTimer) clearInterval(pollTimer);
    if (unsubPhase) {
      try {
        unsubPhase();
      } catch {
        /* ignore */
      }
    }
    overlay.classList.add('imprint-v2-fade-out');
    setTimeout(() => overlay.remove(), 250);
  }

  async function refreshState() {
    const res = await getJson(
      `${baseUrl}/api/coop/imprint/state?code=${encodeURIComponent(code)}`,
    );
    if (res.ok) {
      lastState = res.data;
      render();
    }
    return res;
  }

  async function makeChoice(value) {
    if (isHost || !config) return;
    const res = await postJson(`${baseUrl}/api/coop/imprint/choice`, {
      code,
      player_id: playerId,
      player_token: playerToken,
      axis: config.field,
      value,
    });
    if (res.ok) {
      lastState = {
        phase: res.data.phase,
        ready_list: res.data.ready_list,
        choices_aggregate: lastState?.choices_aggregate || null,
        biome: res.data.biome || null,
      };
      render();
    } else {
      const errBox = stage.querySelector('.imprint-v2-error');
      if (errBox) errBox.textContent = `Errore: ${res.data?.error || res.status}`;
    }
  }

  // ── Render: TV (host) ─────────────────────────────────────────────
  function renderTV() {
    stage.innerHTML = '';
    const ready = lastState?.ready_list || [];
    const biome = lastState?.biome || null;
    const chosenCount = ready.filter((r) => r.ready).length;

    const header = el('div', { class: 'tv-header' }, [
      el('h2', {}, ["📺 L'Impronta"]),
      el(
        'div',
        { class: 'tv-subtitle' },
        [
          chosenCount === 0
            ? 'Quattro di voi. Quattro creature. Un mondo da scoprire.'
            : chosenCount < 4
              ? `${chosenCount}/4 scelte fatte. Le altre creature aspettano.`
              : '✦ Il mondo si forma. ✦',
        ],
      ),
    ]);
    stage.appendChild(header);

    const grid = el('div', { class: 'tv-creatures' });
    ['p1', 'p2', 'p3', 'p4'].forEach((p, idx) => {
      const choice = ready[idx];
      const card = el(
        'div',
        {
          class: `creature-card ${p}${choice?.ready ? ' has-choices' : ''}`,
          dataset: { player: p },
        },
        [
          el('div', { class: 'player-tag', style: `color: var(--${p})` }, [
            el('span', { class: 'pnum' }, [p.toUpperCase()]),
            el('span', { class: 'ppart' }, [PLAYER_PART_LABEL[p]]),
          ]),
          el('div', { class: 'silhouette' }, [PLAYER_EMOJI[p] || '?']),
          el(
            'div',
            { class: 'glyphs' },
            choice?.ready
              ? [el('span', { class: 'glyph' }, [`${choice.axis}: ${choice.value}`])]
              : [],
          ),
        ],
      );
      grid.appendChild(card);
    });
    stage.appendChild(grid);

    const biomeBox = el('div', { class: 'biome-reveal' });
    if (biome && !biome.error) {
      biomeBox.appendChild(
        el('div', { class: 'biome-name' }, [BIOME_NAMES[biome.biome_id] || biome.biome_id]),
      );
      if (biome.biome_id !== biome.base_biome_id) {
        biomeBox.appendChild(
          el('div', { class: 'biome-base' }, [
            `(variante di ${BIOME_NAMES[biome.base_biome_id] || biome.base_biome_id})`,
          ]),
        );
      }
      if (Array.isArray(biome.applied_modulations) && biome.applied_modulations.length) {
        biomeBox.appendChild(
          el('div', { class: 'modulations' }, [
            `⚡ Modulation: ${biome.applied_modulations.join(', ')}`,
          ]),
        );
      }
    } else {
      biomeBox.appendChild(
        el('div', { class: 'pending' }, ["Il bioma emergerà quando avrete scelto tutti."]),
      );
    }
    stage.appendChild(biomeBox);

    if (biome && !biome.error) {
      const foodweb = FOODWEB_BY_BIOME[biome.base_biome_id];
      if (foodweb) {
        const fw = el('div', { class: 'foodweb' }, [
          el('div', { class: 'foodweb-title' }, [
            '🌐 Foodweb del bioma (4 creature condividono ecosistema)',
          ]),
          el('div', { class: 'foodweb-list' }, foodweb.map((it) =>
            el('span', { class: 'foodweb-item' }, [it]),
          )),
        ]);
        stage.appendChild(fw);
      }
    }

    if (biome && !biome.error && chosenCount === 4) {
      const epilogue = el('div', { class: 'epilogue' }, [
        el('div', { class: 'epilogue-title' }, [
          "📍 Fine \"L'Impronta\" — Primi 60s completi",
        ]),
        el('div', { class: 'epilogue-text' }, [
          `Il vostro bioma è `,
          el('strong', {}, [BIOME_NAMES[biome.biome_id] || biome.biome_id]),
          `. Le 4 creature sono pronte ad esplorarlo insieme.`,
          el('span', { class: 'epilogue-next' }, [
            "→ Round 0 si apre con il foodweb già rivelato sopra.",
          ]),
        ]),
        el('div', { class: 'epilogue-actions' }, [
          el(
            'button',
            {
              class: 'ep-btn primary',
              type: 'button',
              onclick: () => {
                resolved = biome;
              },
            },
            ['🎬 Continua → Round 0'],
          ),
        ]),
      ]);
      stage.appendChild(epilogue);
    }
  }

  // ── Render: Phone (player) ────────────────────────────────────────
  function renderPhone() {
    stage.innerHTML = '';
    const ready = lastState?.ready_list || [];
    const myReady = ready.find((r) => r.player_id === playerId);
    const myChoiceValue = myReady?.value || null;

    const myCreature = el('div', { class: 'my-creature' }, [
      el('div', { class: 'my-creature-label' }, ['LA TUA CREATURA']),
      el(
        'div',
        {
          class: `my-creature-emoji${myChoiceValue ? ' chosen' : ''}`,
        },
        [PLAYER_EMOJI[role] || '❓'],
      ),
      el('div', { class: 'my-creature-id' }, [role.toUpperCase()]),
    ]);
    stage.appendChild(myCreature);

    const phoneHeader = el('div', { class: 'phone-header' }, [
      el('span', { class: `phone-tag player-bg-${role}` }, [config.name]),
    ]);
    stage.appendChild(phoneHeader);

    stage.appendChild(el('div', { class: 'body-part' }, [config.bodyPart]));
    stage.appendChild(el('div', { class: 'question' }, [config.question]));

    const choices = el('div', { class: 'choices' });
    for (const opt of config.options) {
      const btn = el(
        'button',
        {
          class: `choice-btn${myChoiceValue === opt.value ? ' selected' : ''}`,
          type: 'button',
          onclick: () => makeChoice(opt.value),
        },
        [
          el('div', { class: 'choice-label' }, [opt.label]),
          el('div', { class: 'choice-desc' }, [opt.desc]),
        ],
      );
      choices.appendChild(btn);
    }
    stage.appendChild(choices);

    const status = myChoiceValue
      ? `${config.name}: ${myChoiceValue} ✓ — aspetta gli altri`
      : `${config.name}: scegli`;
    stage.appendChild(el('div', { class: 'imprint-v2-status' }, [status]));
    stage.appendChild(el('div', { class: 'imprint-v2-error' }, []));

    if (lastState?.biome && !lastState.biome.error) {
      stage.appendChild(
        el('div', { class: 'biome-reveal' }, [
          el('div', { class: 'biome-name' }, [
            BIOME_NAMES[lastState.biome.biome_id] || lastState.biome.biome_id,
          ]),
        ]),
      );
    }
  }

  function render() {
    if (isHost) renderTV();
    else renderPhone();
  }

  // ── Wiring ────────────────────────────────────────────────────────
  if (isHost && autoStart) {
    if (!hostToken) throw new Error('openImprintPanelV2: hostToken required for host role');
    const startRes = await postJson(`${baseUrl}/api/coop/imprint/start`, {
      code,
      host_token: hostToken,
    });
    if (!startRes.ok && startRes.data?.error !== 'cannot_start_from_phase:imprint') {
      console.warn('[imprint-v2] start failed:', startRes.data);
    }
  }

  if (client && typeof client.on === 'function') {
    unsubPhase = client.on('phase_change', () => {
      refreshState().catch(() => {});
    });
  }

  await refreshState();
  pollTimer = setInterval(() => {
    refreshState().catch(() => {});
    if (resolved) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }, 2000);

  // Wait for resolved (host clicks Continue) or biome arrives + auto-resolve for players
  await new Promise((r) => {
    const iv = setInterval(() => {
      if (resolved) {
        clearInterval(iv);
        r();
      } else if (!isHost && lastState?.biome && !lastState.biome.error) {
        // Player auto-resolve as soon as biome appears (host gates with explicit click)
        resolved = lastState.biome;
        clearInterval(iv);
        r();
      }
    }, 200);
  });

  cleanup();
  return resolved;
}

/**
 * Demo bootstrap helper for `?imprint_v2=<role>` smoke testing.
 * First tab (or after demo reset) creates lobby + joins 4 players + starts imprint;
 * subsequent tabs read the shared session from localStorage and rejoin.
 *
 * @param {object} params
 * @param {'tv'|'p1'|'p2'|'p3'|'p4'} params.role
 * @param {string} [params.baseUrl]
 * @param {boolean} [params.reset] - clear shared state and re-create
 * @returns {Promise<{code, role, playerId, playerToken?, hostToken?}>}
 */
export async function bootstrapImprintDemo({ role, baseUrl = '', reset = false } = {}) {
  const STORE_KEY = 'imprintV2DemoSession';
  if (reset) localStorage.removeItem(STORE_KEY);
  let session = null;
  try {
    session = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  } catch {
    session = null;
  }

  // Validate session is still alive (cheap state probe).
  if (session?.code) {
    const probe = await getJson(
      `${baseUrl}/api/coop/imprint/state?code=${encodeURIComponent(session.code)}`,
    );
    if (!probe.ok) session = null;
  }

  if (!session) {
    const create = await postJson(`${baseUrl}/api/lobby/create`, {
      host_name: 'Demo Host',
      max_players: 5,
    });
    if (!create.ok) throw new Error(`demo lobby/create failed: ${create.status}`);
    const { code, host_token: hostToken, player_id: hostPlayerId } = create.data;
    const players = {};
    for (const slot of ['p1', 'p2', 'p3', 'p4']) {
      const join = await postJson(`${baseUrl}/api/lobby/join`, {
        code,
        player_name: slot.toUpperCase(),
      });
      if (!join.ok) throw new Error(`demo lobby/join ${slot} failed: ${join.status}`);
      players[slot] = { id: join.data.player_id, token: join.data.player_token };
    }
    const start = await postJson(`${baseUrl}/api/coop/imprint/start`, {
      code,
      host_token: hostToken,
    });
    if (!start.ok) throw new Error(`demo imprint/start failed: ${start.status}`);
    session = { code, hostToken, hostPlayerId, players };
    localStorage.setItem(STORE_KEY, JSON.stringify(session));
  }

  if (role === 'tv' || role === 'host') {
    return {
      code: session.code,
      role: 'host',
      playerId: session.hostPlayerId,
      hostToken: session.hostToken,
    };
  }
  const slot = session.players[role];
  if (!slot) throw new Error(`demo: unknown role ${role}`);
  return {
    code: session.code,
    role,
    playerId: slot.id,
    playerToken: slot.token,
  };
}

export default { openImprintPanelV2, bootstrapImprintDemo };
