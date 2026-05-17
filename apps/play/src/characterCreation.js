// M17 — Character Creation overlay (phone).
// Jackbox pattern: 1 PG per player, scelta nome + form MBTI + species.
// ADR coop-mvp-spec.md §2.2.

// MVP form pool: 16 MBTI cards. Stats indicativi (real mapping M18+ via
// data/core/forms/mbti_forms.yaml server-side).
const FORM_POOL = [
  { id: 'istj_custode', label: 'Custode', mbti: 'ISTJ', blurb: '+HP +DEF', job: 'vanguard' },
  { id: 'istp_artigiano', label: 'Artigiano', mbti: 'ISTP', blurb: '+Crit', job: 'skirmisher' },
  { id: 'isfj_difensore', label: 'Difensore', mbti: 'ISFJ', blurb: '+Heal', job: 'support' },
  { id: 'isfp_artefice', label: 'Artefice', mbti: 'ISFP', blurb: '+Evasion', job: 'skirmisher' },
  { id: 'intj_stratega', label: 'Stratega', mbti: 'INTJ', blurb: '+MoS', job: 'gladiator' },
  { id: 'intp_architetto', label: 'Architetto', mbti: 'INTP', blurb: '+Range', job: 'ranger' },
  { id: 'infj_mistico', label: 'Mistico', mbti: 'INFJ', blurb: '+Focus', job: 'support' },
  { id: 'infp_visionario', label: 'Visionario', mbti: 'INFP', blurb: '+Morale', job: 'support' },
  { id: 'estj_comandante', label: 'Comandante', mbti: 'ESTJ', blurb: '+Cmd', job: 'gladiator' },
  {
    id: 'estp_avventuriero',
    label: 'Avventuriero',
    mbti: 'ESTP',
    blurb: '+Speed',
    job: 'skirmisher',
  },
  { id: 'esfj_cortigiano', label: 'Cortigiano', mbti: 'ESFJ', blurb: '+Team', job: 'support' },
  { id: 'esfp_performer', label: 'Performer', mbti: 'ESFP', blurb: '+Taunt', job: 'gladiator' },
  { id: 'entj_generale', label: 'Generale', mbti: 'ENTJ', blurb: '+Leader', job: 'gladiator' },
  {
    id: 'entp_sperimentatore',
    label: 'Sperimentatore',
    mbti: 'ENTP',
    blurb: '+Combo',
    job: 'skirmisher',
  },
  { id: 'enfj_mentore', label: 'Mentore', mbti: 'ENFJ', blurb: '+Buff', job: 'support' },
  { id: 'enfp_catalysta', label: 'Catalysta', mbti: 'ENFP', blurb: '+Team', job: 'support' },
];

const SPECIES_POOL = [
  { id: 'scagliato', label: 'Scagliato', blurb: 'Corazza' },
  { id: 'corvide', label: 'Corvide', blurb: 'Velocità' },
  { id: 'saltatore', label: 'Saltatore', blurb: 'Mobilità' },
  { id: 'velox', label: 'Velox', blurb: 'Iniziativa' },
  { id: 'carapax', label: 'Carapax', blurb: 'Difesa' },
  { id: 'feloid', label: 'Feloid', blurb: 'Agilità' },
];

function previewStats(form) {
  const jobStats = {
    vanguard: { hp: 28, ap: 2, atk: 4, def: 5 },
    gladiator: { hp: 24, ap: 2, atk: 5, def: 3 },
    skirmisher: { hp: 18, ap: 3, atk: 3, def: 2 },
    support: { hp: 20, ap: 2, atk: 2, def: 3 },
    ranger: { hp: 20, ap: 2, atk: 4, def: 2 },
  };
  return jobStats[form.job] || { hp: 22, ap: 2, atk: 3, def: 3 };
}

export function renderCharacterCreation() {
  if (typeof document === 'undefined') return null;
  let overlay = document.getElementById('char-creation-overlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'char-creation-overlay';
  overlay.className = 'char-creation-overlay';
  overlay.innerHTML = `
    <div class="cc-wrap">
      <div class="cc-phase">
        <span class="cc-phase-icon">🎭</span>
        <span class="cc-phase-label">Crea il tuo PG</span>
        <span class="cc-phase-progress" id="cc-progress">0/?</span>
      </div>

      <div class="cc-section">
        <label class="cc-label" for="cc-name">Nome PG</label>
        <input type="text" id="cc-name" maxlength="30" placeholder="Aria, Bruno…" />
      </div>

      <div class="cc-section">
        <div class="cc-label">Forma (MBTI)</div>
        <div class="cc-grid" id="cc-form-grid">
          ${FORM_POOL.map(
            (f) => `
            <button type="button" class="cc-card cc-form-card" data-form="${f.id}">
              <div class="cc-card-title">${f.label}</div>
              <div class="cc-card-sub">${f.mbti}</div>
              <div class="cc-card-blurb">${f.blurb}</div>
            </button>
          `,
          ).join('')}
        </div>
      </div>

      <div class="cc-section">
        <div class="cc-label">Specie</div>
        <div class="cc-grid cc-grid-small" id="cc-species-grid">
          ${SPECIES_POOL.map(
            (s) => `
            <button type="button" class="cc-card cc-species-card" data-species="${s.id}">
              <div class="cc-card-title">${s.label}</div>
              <div class="cc-card-blurb">${s.blurb}</div>
            </button>
          `,
          ).join('')}
        </div>
      </div>

      <div class="cc-section cc-preview" id="cc-preview">
        <div class="cc-preview-title">Statistiche preview</div>
        <div class="cc-preview-stats" id="cc-preview-stats">
          <span>HP —</span><span>AP —</span><span>ATK —</span><span>DEF —</span>
        </div>
        <div class="cc-preview-packs" id="cc-preview-packs" aria-live="polite"></div>
        <!-- TKT-ECO-A6 — starter bioma label (Form MBTI -> biome+trait). -->
        <div class="cc-preview-starter-bioma" id="cc-preview-starter-bioma" aria-live="polite"></div>
      </div>

      <button type="button" class="cc-confirm" id="cc-confirm" disabled>
        ✓ Conferma PG
      </button>
      <div class="cc-status" id="cc-status" aria-live="polite"></div>

      <div class="cc-section">
        <div class="cc-label">Party (<span id="cc-party-count">0</span>)</div>
        <div class="cc-party" id="cc-party"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

export function wireCharacterCreation(overlay, bridge) {
  if (!overlay || !bridge) return null;
  const state = {
    name: '',
    form: null,
    species: null,
    submitted: false,
    partyList: [],
  };

  const nameInput = overlay.querySelector('#cc-name');
  const confirmBtn = overlay.querySelector('#cc-confirm');
  const statusEl = overlay.querySelector('#cc-status');
  const previewStatsEl = overlay.querySelector('#cc-preview-stats');

  const setStatus = (msg, kind) => {
    statusEl.textContent = msg || '';
    statusEl.dataset.kind = kind || '';
  };

  const updateConfirm = () => {
    const valid = !!state.name.trim() && !!state.form && !!state.species && !state.submitted;
    confirmBtn.disabled = !valid;
  };

  const packsEl = overlay.querySelector('#cc-preview-packs');
  // TKT-ECO-A6 — starter bioma slot (Form MBTI -> biome_id + trait_id resolution).
  const starterBiomaEl = overlay.querySelector('#cc-preview-starter-bioma');

  const renderPreview = () => {
    if (!state.form) return;
    const stats = previewStats(state.form);
    previewStatsEl.innerHTML = `
      <span>HP ${stats.hp}</span>
      <span>AP ${stats.ap}</span>
      <span>ATK ${stats.atk}</span>
      <span>DEF ${stats.def}</span>
    `;
    fetchPacksForForm(state.form.id, state.form.job);
    // TKT-ECO-A6 — fetch + render starter bioma per Form MBTI.
    fetchStarterBiomaForForm(state.form.mbti);
  };

  // V4 PI-Pacchetti tematici — fetch form-appropriate pack bias hint.
  async function fetchPacksForForm(formId, jobId) {
    if (!packsEl || !formId) return;
    packsEl.textContent = 'Pacchetti PI consigliati…';
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(formId)}/packs`);
      if (!res.ok) {
        packsEl.textContent = '';
        return;
      }
      const data = await res.json();
      const universal = Array.isArray(data.universal) ? data.universal.slice(0, 3) : [];
      const biasForm = Array.isArray(data.bias_forma) ? data.bias_forma.slice(0, 3) : [];
      const biasJob =
        jobId && data.bias_job && Array.isArray(data.bias_job[jobId])
          ? data.bias_job[jobId].slice(0, 3)
          : [];
      const list = [...biasForm, ...biasJob, ...universal];
      if (!list.length) {
        packsEl.textContent = '';
        return;
      }
      packsEl.innerHTML =
        `<div class="cc-preview-packs-title">Pacchetti PI consigliati</div>` +
        list.map((p) => `<span class="cc-preview-pack">${p.label || p.id || p}</span>`).join(' ');
    } catch {
      packsEl.textContent = '';
    }
  }

  // TKT-ECO-A6 / M-017 — Form MBTI -> starter bioma label resolution.
  // Backend chain: STARTER_BIOMA_MAP (16 forms) in formPackRecommender.js +
  // active_effects.yaml starter_bioma_<form> (16 traits). Surface label
  // exposure mancante pre-A6 = anti-pattern Engine LIVE Surface DEAD.
  async function fetchStarterBiomaForForm(mbti) {
    if (!starterBiomaEl) return;
    if (!mbti || typeof mbti !== 'string') {
      starterBiomaEl.textContent = '';
      return;
    }
    starterBiomaEl.textContent = 'Bioma origine…';
    try {
      const formId = mbti.toUpperCase();
      const res = await fetch(`/api/forms/${encodeURIComponent(formId)}/starter-bioma`);
      if (!res.ok) {
        starterBiomaEl.textContent = '';
        return;
      }
      const data = await res.json();
      if (!data?.biome_id || !data?.trait_id) {
        starterBiomaEl.textContent = '';
        return;
      }
      const biomeLabel = data.biome_id.replace(/_/g, ' ');
      starterBiomaEl.innerHTML =
        `<div class="cc-preview-starter-bioma-title">Bioma origine</div>` +
        `<span class="cc-preview-starter-bioma-biome">🌍 ${biomeLabel}</span>` +
        ` → <span class="cc-preview-starter-bioma-trait">${data.trait_id}</span>`;
    } catch {
      starterBiomaEl.textContent = '';
    }
  }

  const renderParty = () => {
    const list = overlay.querySelector('#cc-party');
    const count = overlay.querySelector('#cc-party-count');
    const prog = overlay.querySelector('#cc-progress');
    const entries = state.partyList || [];
    if (count) count.textContent = String(entries.length);
    const readyCount = entries.filter((e) => e.ready).length;
    if (prog) prog.textContent = `${readyCount}/${entries.length || '?'}`;
    list.innerHTML = entries.length
      ? entries
          .map((e) => {
            const form = FORM_POOL.find((f) => f.id === e.form_id);
            return `<div class="cc-party-row ${e.ready ? 'ready' : 'pending'}">
              <span class="cc-party-dot"></span>
              <span class="cc-party-name">${e.name || '—'}</span>
              <span class="cc-party-form">${form ? form.label : e.ready ? '—' : 'scegliendo'}</span>
            </div>`;
          })
          .join('')
      : '<div class="cc-empty">Solo tu per ora</div>';
  };

  nameInput.addEventListener('input', () => {
    state.name = nameInput.value;
    updateConfirm();
  });

  overlay.querySelectorAll('.cc-form-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.submitted) return;
      const id = btn.dataset.form;
      state.form = FORM_POOL.find((f) => f.id === id);
      overlay
        .querySelectorAll('.cc-form-card')
        .forEach((b) => b.classList.toggle('selected', b === btn));
      renderPreview();
      updateConfirm();
    });
  });

  overlay.querySelectorAll('.cc-species-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.submitted) return;
      const id = btn.dataset.species;
      state.species = SPECIES_POOL.find((s) => s.id === id);
      overlay
        .querySelectorAll('.cc-species-card')
        .forEach((b) => b.classList.toggle('selected', b === btn));
      updateConfirm();
    });
  });

  confirmBtn.addEventListener('click', async () => {
    if (state.submitted || !state.name || !state.form || !state.species) return;
    setStatus('Invio PG…');
    confirmBtn.disabled = true;
    try {
      const res = await fetch('/api/coop/character/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: bridge.session.code,
          player_id: bridge.session.player_id,
          player_token: bridge.session.token,
          name: state.name.trim(),
          form_id: state.form.id,
          species_id: state.species.id,
          job_id: state.form.job,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(`Errore: ${data?.error || 'HTTP ' + res.status}`, 'err');
        confirmBtn.disabled = false;
        return;
      }
      state.submitted = true;
      setStatus('✓ PG inviato — attendo altri', 'ok');
      nameInput.disabled = true;
      overlay.querySelectorAll('.cc-card').forEach((b) => (b.disabled = true));
    } catch (err) {
      setStatus(`Errore rete: ${err.message}`, 'err');
      confirmBtn.disabled = false;
    }
  });

  return {
    onCharacterReadyList(list) {
      state.partyList = Array.isArray(list) ? list : [];
      renderParty();
      // If my own entry is ready but state.submitted is false, sync UI.
      const myEntry = state.partyList.find((e) => e.player_id === bridge.session.player_id);
      if (myEntry?.ready && !state.submitted) {
        state.submitted = true;
        confirmBtn.disabled = true;
        nameInput.disabled = true;
      }
    },
    show() {
      overlay.classList.remove('cc-hidden');
    },
    hide() {
      overlay.classList.add('cc-hidden');
    },
    destroy() {
      overlay.remove();
    },
  };
}
