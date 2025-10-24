const DATA_SOURCES = [
  { key: "packs", path: "data/packs.yaml" },
  { key: "telemetry", path: "data/telemetry.yaml" },
  { key: "biomes", path: "data/biomes.yaml" },
  { key: "mating", path: "data/mating.yaml" },
  { key: "species", path: "data/species.yaml" }
];

const state = {
  data: {},
  loadedAt: null,
  dataBase: null,
  selectedForm: "",
  formFilter: ""
};

const manualPreviewState = {
  raw: null,
  sections: [],
  sectionIndex: 0,
  pageIndex: 0,
  summary: "",
  sourceLabel: "",
  format: "",
  warnings: [],
};

const MANUAL_SYNC_STORAGE_KEY = "et-manual-sync-payload";
const MANUAL_SYNC_HISTORY_KEY = "et-manual-sync-history";
const MANUAL_NOTES_STORAGE_KEY = "et-manual-research-notes";
const MANUAL_FLAGS_STORAGE_KEY = "et-manual-flags";
const MANUAL_CHECKLIST_STORAGE_KEY = "et-manual-checklist";

const PAGE_MODES = {
  DASHBOARD: "dashboard",
  MANUAL_FETCH: "manual-fetch",
};

let pageMode = PAGE_MODES.DASHBOARD;

const manualPageState = {
  options: {
    allowArchive: true,
    runDiagnostics: true,
    autoApply: true,
    autoTests: true,
    targetDataset: "",
  },
  lastResult: null,
};

const PREVIEW_PAGE_SIZE_DEFAULT = 20;
const PREVIEW_PAGE_SIZES = {
  species: 8,
  forms: 12,
  derivatives: 12,
  catalog: 10,
};
const PREVIEW_SECTION_PRIORITY = ["species", "forms", "derivatives"];
const PREVIEW_SECTION_LABELS = {
  species: "Specie",
  forms: "Forme",
  derivatives: "Derivati",
  catalog: "Catalogo",
  packs: "Pacchetti",
  telemetry: "Telemetria",
  biomes: "Biomi",
  mating: "Compatibilità",
  items: "Elementi",
  estratti: "Contenuti estratti",
};
const PREVIEW_LABEL_COLLATOR = new Intl.Collator("it", { sensitivity: "base" });

const metricsElements = {};
const controlElements = {};
const infoElements = {};
const manualElements = {};

function formatLabel(value) {
  if (!value) return "";
  return String(value)
    .split(/[._]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatFileSize(bytes) {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) {
    return "";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const formatted = unitIndex === 0 ? Math.round(value).toString() : value.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
}

function detectPageMode() {
  const mode = document.body?.dataset?.page;
  if (mode === PAGE_MODES.MANUAL_FETCH) {
    return PAGE_MODES.MANUAL_FETCH;
  }
  return PAGE_MODES.DASHBOARD;
}

function readJsonStorage(key) {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Impossibile leggere i dati da localStorage (${key})`, error);
    return null;
  }
}

function writeJsonStorage(key, value) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
    return true;
  } catch (error) {
    console.warn(`Impossibile scrivere i dati in localStorage (${key})`, error);
    return false;
  }
}

function describeModuleEffects(effects) {
  if (!effects || typeof effects !== "object") {
    return "Effetti non definiti";
  }

  const details = [];
  if (effects.resistances) {
    const resEntries = Object.entries(effects.resistances || {})
      .flatMap(([key, value]) => {
        if (value && typeof value === "object") {
          return Object.keys(value);
        }
        return key;
      })
      .filter(Boolean);
    if (resEntries.length) {
      details.push(`Resistenze: ${resEntries.map(formatLabel).join(", ")}`);
    }
  }

  const otherKeys = Object.keys(effects).filter((key) => key !== "resistances");
  if (otherKeys.length) {
    details.push(otherKeys.map(formatLabel).join(" · "));
  }

  return details.length ? details.join(" · ") : "Nessun effetto specificato";
}

function formatSynergyRequirements(requirements) {
  if (!Array.isArray(requirements) || !requirements.length) return "Trigger non definiti";
  return requirements
    .map((requirement) => {
      const [slot, module] = String(requirement).split(".");
      return module ? `${formatLabel(slot)} → ${formatLabel(module)}` : formatLabel(requirement);
    })
    .join(" · ");
}

function setupDomReferences() {
  controlElements.fetchForm = document.getElementById("fetch-form");
  controlElements.fetchUrl = document.getElementById("fetch-url");
  controlElements.fetchFile = document.getElementById("fetch-file");
  controlElements.fetchStatus = document.getElementById("fetch-status");
  controlElements.fetchPreview = document.getElementById("fetch-preview");
  controlElements.fetchPreviewBody = document.getElementById("fetch-preview-body");
  controlElements.fetchPreviewSummary = document.getElementById("fetch-preview-summary");
  controlElements.fetchPreviewWarnings = document.getElementById("fetch-preview-warnings");
  controlElements.fetchPreviewTabs = document.getElementById("fetch-preview-tabs");
  controlElements.fetchPreviewContent = document.getElementById("fetch-preview-content");
  controlElements.fetchPreviewPagination = document.getElementById("fetch-preview-pagination");
  controlElements.fetchPreviewEmpty = document.getElementById("fetch-preview-empty");

  if (pageMode === PAGE_MODES.MANUAL_FETCH) {
    manualElements.optionArchive = document.getElementById("manual-option-archive");
    manualElements.optionDiagnostics = document.getElementById("manual-option-diagnostics");
    manualElements.optionAutoApply = document.getElementById("manual-option-auto-apply");
    manualElements.optionAutoTests = document.getElementById("manual-option-auto-tests");
    manualElements.targetDataset = document.getElementById("manual-target");
    manualElements.metadata = document.getElementById("manual-fetch-metadata");
    manualElements.diagnostics = document.getElementById("manual-diagnostics");
    manualElements.syncStatus = document.getElementById("manual-sync-status");
    manualElements.syncHistory = document.getElementById("manual-sync-history");
    manualElements.pendingSummary = document.getElementById("manual-pending-summary");
    manualElements.notes = document.getElementById("manual-research-notes");
    manualElements.checklistInputs = Array.from(
      document.querySelectorAll('[data-manual-flag]') || []
    );
  } else {
    metricsElements.forms = document.querySelector('[data-metric="forms"]');
    metricsElements.random = document.querySelector('[data-metric="random"]');
    metricsElements.indices = document.querySelector('[data-metric="indices"]');
    metricsElements.biomes = document.querySelector('[data-metric="biomes"]');
    metricsElements.speciesSlots = document.querySelector('[data-metric="species-slots"]');
    metricsElements.speciesSynergies = document.querySelector('[data-metric="species-synergies"]');
    metricsElements.timestamp = document.getElementById("last-updated");

    controlElements.runTests = document.getElementById("run-tests");
    controlElements.testResults = document.getElementById("test-results");
    controlElements.formSelector = document.getElementById("form-selector");
    controlElements.formFilter = document.getElementById("form-filter");
    controlElements.rollD20 = document.getElementById("roll-d20");
    controlElements.rollBias = document.getElementById("roll-bias");
    controlElements.rollD20Result = document.getElementById("roll-d20-result");
    controlElements.biasResult = document.getElementById("bias-roll-result");
    controlElements.encounterButton = document.getElementById("generate-encounter");
    controlElements.encounterResult = document.getElementById("encounter-result");
    controlElements.manualSyncLast = document.getElementById("manual-sync-last");
    controlElements.manualSyncSummary = document.getElementById("manual-sync-summary");

    infoElements.dataSource = document.getElementById("data-source");
    infoElements.piShop = document.getElementById("pi-shop-content");
  }
}

async function loadYaml(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Impossibile caricare ${path} (${response.status})`);
  }
  const text = await response.text();
  return jsyaml.load(text);
}

async function loadAllData() {
  if (!state.dataBase) {
    state.dataBase = detectDataBase();
    updateDataSourceHint();
  }

  setTimestamp("Caricamento in corso…");
  try {
    const entries = await Promise.all(
      DATA_SOURCES.map(async (source) => {
        const url = resolveDataPath(source.path);
        const value = await loadYaml(url);
        return [source.key, value];
      })
    );
    state.data = Object.fromEntries(entries);
    state.loadedAt = new Date();
    renderAll();
    const sourceLabel = state.dataBase ? ` · sorgente dati: ${state.dataBase}` : "";
    setTimestamp(`Ultimo aggiornamento: ${state.loadedAt.toLocaleString()}${sourceLabel}`);
    consumePendingManualSync();
  } catch (error) {
    console.error(error);
    setTimestamp(`Errore nel caricamento: ${error.message}`);
  }
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeBase(value) {
  if (!value) return null;

  try {
    const absolute = new URL(value, window.location.href);
    return ensureTrailingSlash(absolute.toString());
  } catch (error) {
    console.warn("Impossibile normalizzare la sorgente dati", value, error);
    return ensureTrailingSlash(value);
  }
}

function detectDataBase() {
  const params = new URLSearchParams(window.location.search);
  const override = params.get("data-root");
  if (override) {
    return normalizeBase(override);
  }

  const metaOverride = document
    .querySelector('meta[name="data-root"]')
    ?.getAttribute("content");
  if (metaOverride) {
    return normalizeBase(metaOverride);
  }

  if (window.location.hostname.endsWith("github.io")) {
    const owner = window.location.hostname.split(".")[0];
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const repo = pathParts.length > 0 ? pathParts[0] : "";
    const branch = params.get("ref") ||
      document
        .querySelector('meta[name="data-branch"]')
        ?.getAttribute("content") ||
      "main";

    if (owner && repo) {
      return ensureTrailingSlash(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`
      );
    }
  }

  if (window.location.origin.startsWith("http")) {
    return ensureTrailingSlash(`${window.location.origin}/`);
  }

  return null;
}

function resolveDataPath(path) {
  if (!state.dataBase) {
    state.dataBase = detectDataBase();
    updateDataSourceHint();
  }

  if (!state.dataBase) {
    return path;
  }

  return new URL(path, state.dataBase).toString();
}

function updateDataSourceHint() {
  if (!infoElements.dataSource) return;

  if (!state.dataBase) {
    infoElements.dataSource.textContent = "Sorgente dati: in rilevamento…";
    return;
  }

  infoElements.dataSource.textContent = `Sorgente dati: ${state.dataBase}`;
}

function renderAll() {
  updateOverview();
  populateFormSelector();
  renderPiShop();
  renderRandomTable();
  renderTelemetry();
  renderBiomes();
  renderSpeciesShowcase();
  refreshPlaytestTools();
}

function setTimestamp(text) {
  if (metricsElements.timestamp) {
    metricsElements.timestamp.textContent = text;
  }
}

function updateOverview() {
  const packs = state.data.packs || {};
  const forms = packs.forms ? Object.keys(packs.forms) : [];
  const randomTable = Array.isArray(packs.random_general_d20)
    ? packs.random_general_d20.length
    : 0;
  const indices = state.data.telemetry?.indices
    ? Object.keys(state.data.telemetry.indices).length
    : 0;
  const biomeCount = state.data.biomes?.biomes
    ? Object.keys(state.data.biomes.biomes).length
    : 0;
  const speciesSlots = state.data.species?.catalog?.slots || {};
  const speciesModules = Object.values(speciesSlots).reduce(
    (total, slotGroup) => total + Object.keys(slotGroup || {}).length,
    0
  );
  const synergyCount = Array.isArray(state.data.species?.catalog?.synergies)
    ? state.data.species.catalog.synergies.length
    : 0;

  if (metricsElements.forms) metricsElements.forms.textContent = forms.length;
  if (metricsElements.random) metricsElements.random.textContent = randomTable;
  if (metricsElements.indices) metricsElements.indices.textContent = indices;
  if (metricsElements.biomes) metricsElements.biomes.textContent = biomeCount;
  if (metricsElements.speciesSlots) {
    metricsElements.speciesSlots.textContent = speciesModules || "—";
  }
  if (metricsElements.speciesSynergies) {
    metricsElements.speciesSynergies.textContent = synergyCount || "—";
  }
}

function populateFormSelector() {
  const selector = controlElements.formSelector || document.getElementById("form-selector");
  if (!selector) return;

  const forms = state.data.packs?.forms ? Object.keys(state.data.packs.forms) : [];
  const filter = state.formFilter ? state.formFilter.toLowerCase() : "";
  const filteredForms = forms
    .sort((a, b) => a.localeCompare(b))
    .filter((formId) => formMatchesFilter(formId, filter));

  selector.innerHTML = '<option value="">Scegli…</option>';

  filteredForms.forEach((formId) => {
    const option = document.createElement("option");
    option.value = formId;
    option.textContent = formId;
    selector.appendChild(option);
  });

  if (!filteredForms.length) {
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.disabled = true;
    placeholderOption.textContent = "Nessuna forma trovata";
    selector.appendChild(placeholderOption);
  }

  let nextSelection = "";
  if (state.selectedForm && filteredForms.includes(state.selectedForm)) {
    nextSelection = state.selectedForm;
  } else if (filteredForms.length === 1 && filter) {
    nextSelection = filteredForms[0];
  }

  selector.value = nextSelection;
  if (controlElements.formFilter && controlElements.formFilter.value !== state.formFilter) {
    controlElements.formFilter.value = state.formFilter;
  }
  renderFormDetails(nextSelection);
}

function renderFormDetails(formId) {
  const container = document.getElementById("form-details");
  if (!container) return;

  state.selectedForm = formId || "";

  if (!formId) {
    container.innerHTML =
      "<p>Seleziona una forma per visualizzare combinazioni A/B/C, bias d12 e hook di collaborazione.</p>";
    updateBiasTools("");
    return;
  }

  const packData = state.data.packs?.forms?.[formId];
  const compatibility = state.data.mating?.compat_forme?.[formId];

  if (!packData) {
    container.innerHTML = `<p>Nessun dato trovato per la forma <strong>${formId}</strong>.</p>`;
    return;
  }

  const packSections = ["A", "B", "C"].map((slot) => {
    const entries = Array.isArray(packData[slot]) ? packData[slot] : [];
    const listItems = entries
      .map((entry) => `<li>${formatEntry(entry)}</li>`)
      .join("");
    return `
      <article class="card pack-card">
        <h3>Pack ${slot}</h3>
        <ul>${listItems || "<li>—</li>"}</ul>
      </article>
    `;
  });

  const biasEntries = packData.bias_d12
    ? Object.entries(packData.bias_d12)
        .map(([pack, range]) => `<li><strong>${pack}</strong>: ${range}</li>`)
        .join("")
    : "";

  let compatibilityHtml = "";
  if (compatibility) {
    compatibilityHtml = `
      <article class="card persona">
        <h3>${compatibility.archetype || "Archetipo"}</h3>
        <p class="overview">${compatibility.overview || ""}</p>
        <div class="pill-groups">
          ${renderPillGroup("Affinità", compatibility.likes)}
          ${renderPillGroup("Neutrali", compatibility.neutrals)}
          ${renderPillGroup("Attriti", compatibility.dislikes)}
        </div>
      </article>
      <article class="card persona-details">
        ${renderListBlock("Punti di forza", compatibility.strengths)}
        ${renderListBlock("Trigger di stress", compatibility.stress_triggers)}
        ${renderListBlock("Hook di collaborazione", compatibility.collaboration_hooks)}
        <p class="scores">Base scores → like: ${compatibility.base_scores?.like ?? "-"}, neutral: ${compatibility.base_scores?.neutral ?? "-"}, dislike: ${compatibility.base_scores?.dislike ?? "-"}</p>
      </article>
    `;
  }

  container.innerHTML = `
    <div class="cards pack-grid">
      ${packSections.join("")}
      <article class="card bias-card">
        <h3>Bias d12</h3>
        <ul>${biasEntries || "<li>—</li>"}</ul>
      </article>
    </div>
    <div class="cards persona-grid">
      ${
        compatibilityHtml ||
        '<article class="card"><p>Nessun dato di compatibilità disponibile per questa forma.</p></article>'
      }
    </div>
  `;

  updateBiasTools(formId);
}

function renderPiShop() {
  const container = infoElements.piShop || document.getElementById("pi-shop-content");
  if (!container) return;

  const piShop = state.data.packs?.pi_shop;
  if (!piShop) {
    container.innerHTML = "<p class=\"muted\">Nessun dato del negozio PI disponibile.</p>";
    return;
  }

  const costsHtml = renderKeyValueList(piShop.costs);
  const capsHtml = renderKeyValueList(piShop.caps);

  container.innerHTML = `
    <div class="pi-grid">
      <article class="card">
        <h3>Costi PI</h3>
        <ul>${costsHtml}</ul>
      </article>
      <article class="card">
        <h3>Limiti e caps</h3>
        <ul>${capsHtml}</ul>
      </article>
    </div>
    <p class="pi-hint">Aggiorna <code>packs.yaml</code> per modificare costi e limiti disponibili nel negozio.</p>
  `;
}

function renderKeyValueList(source) {
  if (!source || typeof source !== "object" || !Object.keys(source).length) {
    return "<li>—</li>";
  }

  return Object.entries(source)
    .map(([key, value]) => `<li><strong>${key}</strong>: ${formatEntry(value)}</li>`)
    .join("");
}

function formMatchesFilter(formId, filter) {
  if (!filter) return true;

  const normalizedFilter = filter.toLowerCase();
  if (formId.toLowerCase().includes(normalizedFilter)) return true;

  const formData = state.data.packs?.forms?.[formId];
  if (!formData) return false;

  return ["A", "B", "C"].some((slot) => {
    const entries = Array.isArray(formData[slot]) ? formData[slot] : [];
    return entries.some((entry) =>
      searchableStringFromEntry(entry).includes(normalizedFilter)
    );
  });
}

function searchableStringFromEntry(entry) {
  if (entry == null) return "";
  if (typeof entry === "string") return entry.toLowerCase();
  if (typeof entry === "number" || typeof entry === "boolean") {
    return String(entry).toLowerCase();
  }
  if (Array.isArray(entry)) {
    return entry.map((item) => searchableStringFromEntry(item)).join(" ");
  }
  if (typeof entry === "object") {
    return Object.entries(entry)
      .map(([key, value]) => `${key} ${searchableStringFromEntry(value)}`)
      .join(" ")
      .toLowerCase();
  }
  return String(entry).toLowerCase();
}

function refreshPlaytestTools() {
  if (controlElements.rollD20) {
    const table = state.data.packs?.random_general_d20;
    const enabled = Array.isArray(table) && table.length > 0;
    controlElements.rollD20.disabled = !enabled;
    if (!enabled && controlElements.rollD20Result) {
      controlElements.rollD20Result.innerHTML =
        '<p class="muted">Carica i pacchetti per usare il tiro d20.</p>';
      delete controlElements.rollD20Result.dataset.hasResult;
    }
  }

  updateBiasTools(state.selectedForm);

  if (controlElements.encounterButton) {
    const biomes = state.data.biomes?.biomes;
    const enabled = biomes && Object.keys(biomes).length > 0;
    controlElements.encounterButton.disabled = !enabled;
    if (!enabled && controlElements.encounterResult) {
      controlElements.encounterResult.innerHTML =
        '<p class="muted">Aggiungi biomi per generare incontri.</p>';
      delete controlElements.encounterResult.dataset.hasResult;
    }
  }
}

function updateBiasTools(formId) {
  const button = controlElements.rollBias;
  const resultContainer = controlElements.biasResult;
  if (!button) return;

  if (resultContainer && resultContainer.dataset.currentForm !== formId) {
    delete resultContainer.dataset.hasResult;
    delete resultContainer.dataset.currentForm;
  }

  if (!formId) {
    button.disabled = true;
    if (resultContainer) {
      resultContainer.innerHTML =
        '<p class="muted">Seleziona una forma per tirare il d12.</p>';
      delete resultContainer.dataset.hasResult;
    }
    return;
  }

  const bias = state.data.packs?.forms?.[formId]?.bias_d12;
  const hasBias = bias && Object.keys(bias).length > 0;

  button.disabled = !hasBias;
  if (!hasBias) {
    if (resultContainer) {
      resultContainer.innerHTML = `
        <p class="muted">La forma <strong>${formId}</strong> non ha bias d12 configurati.</p>
      `;
      delete resultContainer.dataset.hasResult;
    }
    return;
  }

  if (resultContainer && !resultContainer.dataset.hasResult) {
    resultContainer.innerHTML = '<p class="muted">Pronto al tiro!</p>';
  }
}

function handleRollD20() {
  const table = state.data.packs?.random_general_d20;
  if (!Array.isArray(table) || !table.length) {
    if (controlElements.rollD20Result) {
      controlElements.rollD20Result.innerHTML =
        '<p class="muted">Nessuna tabella caricata.</p>';
      delete controlElements.rollD20Result.dataset.hasResult;
    }
    return;
  }

  const roll = rollDie(20);
  const entry = table.find((row) => rangeContains(row.range, roll));

  if (!entry) {
    if (controlElements.rollD20Result) {
      controlElements.rollD20Result.innerHTML =
        `<p class="muted">Nessuna riga corrisponde al risultato ${roll}.</p>`;
      delete controlElements.rollD20Result.dataset.hasResult;
    }
    return;
  }

  const comboHtml = Array.isArray(entry.combo)
    ? `<ul class="inline-list">${entry.combo
        .map((item) => `<li>${formatEntry(item)}</li>`)
        .join("")}</ul>`
    : entry.combo
    ? `<p>${formatEntry(entry.combo)}</p>`
    : '<p class="muted">Nessuna combo specificata.</p>';

  const notesHtml = entry.notes ? `<p>${entry.notes}</p>` : "";

  if (controlElements.rollD20Result) {
    controlElements.rollD20Result.innerHTML = `
      <p class="dice-roll">🎲 Risultato: <strong>${roll}</strong></p>
      <p class="dice-pack">Pack: <strong>${entry.pack || "—"}</strong></p>
      ${comboHtml}
      ${notesHtml}
    `;
    controlElements.rollD20Result.dataset.hasResult = "true";
  }
}

function handleBiasRoll() {
  const formId = state.selectedForm;
  const packData = formId ? state.data.packs?.forms?.[formId] : null;
  const bias = packData?.bias_d12;

  if (!formId || !bias || Object.keys(bias).length === 0) {
    updateBiasTools(formId || "");
    return;
  }

  const roll = rollDie(12);
  const matched = Object.entries(bias).find(([, range]) => rangeContains(range, roll));

  const packKey = matched ? matched[0] : null;
  const rangeLabel = matched ? matched[1] : null;
  const combo = packKey ? packData[packKey] : null;
  const comboHtml = Array.isArray(combo)
    ? `<ul>${combo.map((entry) => `<li>${formatEntry(entry)}</li>`).join("")}</ul>`
    : packKey
    ? '<p class="muted">Nessuna combinazione collegata.</p>'
    : "";

  const rangeText = rangeLabel ? ` (range ${rangeLabel})` : "";
  const extraNote = matched
    ? ""
    : `<p class="muted">Aggiorna la tabella bias per coprire tutti i risultati.</p>`;

  if (controlElements.biasResult) {
    controlElements.biasResult.innerHTML = `
      <p class="dice-roll">🎲 d12: <strong>${roll}</strong>${rangeText}</p>
      <p class="dice-pack">Pack selezionato: <strong>${packKey || "—"}</strong></p>
      ${comboHtml}
      ${extraNote}
    `;
    controlElements.biasResult.dataset.hasResult = "true";
    controlElements.biasResult.dataset.currentForm = formId;
  }
}

function handleEncounterGenerate() {
  const biomes = state.data.biomes?.biomes;
  if (!biomes || !Object.keys(biomes).length) {
    if (controlElements.encounterResult) {
      controlElements.encounterResult.innerHTML =
        '<p class="muted">Nessun bioma disponibile per il generatore.</p>';
      delete controlElements.encounterResult.dataset.hasResult;
    }
    return;
  }

  const biomeEntries = Object.entries(biomes);
  const [selectedBiome] = pickRandom(biomeEntries, 1);
  if (!selectedBiome) return;

  const [biomeName, biomeDetails] = selectedBiome;
  const affixes = Array.isArray(biomeDetails.affixes)
    ? pickRandom(biomeDetails.affixes, Math.min(2, biomeDetails.affixes.length))
    : [];

  const mutations = state.data.biomes?.mutations || {};
  const mutationT0 = Array.isArray(mutations.t0_table_d12)
    ? pickRandom(mutations.t0_table_d12, 1)[0]
    : null;
  const mutationT1 = Array.isArray(mutations.t1_table_d8)
    ? pickRandom(mutations.t1_table_d8, 1)[0]
    : null;

  const vcAdaptEntries = Object.entries(state.data.biomes?.vc_adapt || {});
  const vcSuggestion = vcAdaptEntries.length ? pickRandom(vcAdaptEntries, 1)[0] : null;

  const frequencyEntries = Object.entries(state.data.biomes?.frequencies || {});
  const frequencyHtml = frequencyEntries
    .map(([name, table]) => {
      const pick = pickWeightedOption(table);
      return `<li><strong>${name}</strong>: ${pick ?? "—"}</li>`;
    })
    .join("");

  const speciesCatalog = state.data.species;
  const synergyList = Array.isArray(speciesCatalog?.catalog?.synergies)
    ? speciesCatalog.catalog.synergies
    : [];
  let synergyHighlight = "";
  if (synergyList.length) {
    const speciesEntries = Array.isArray(speciesCatalog?.species)
      ? speciesCatalog.species
      : [];
    const [randomSpecies] = speciesEntries.length ? pickRandom(speciesEntries, 1, false) : [null];
    const hints = Array.isArray(randomSpecies?.synergy_hints)
      ? randomSpecies.synergy_hints
      : [];
    const hintedSynergy = hints
      .map((hint) => synergyList.find((item) => item.id === hint))
      .find(Boolean);
    const fallbackSynergy = pickRandom(synergyList, 1, false)[0];
    const selectedSynergy = hintedSynergy || fallbackSynergy;

    if (selectedSynergy) {
      const synergyName = selectedSynergy.name || formatLabel(selectedSynergy.id);
      const triggerText = formatSynergyRequirements(selectedSynergy.when_all);
      const speciesName = randomSpecies
        ? randomSpecies.display_name || formatLabel(randomSpecies.id)
        : "Catalogo specie";
      synergyHighlight = `
        <div>
          <h4>Specie &amp; sinergie</h4>
          <p><strong>${speciesName}</strong> → ${synergyName}</p>
          <p class="muted">Trigger: ${triggerText}</p>
        </div>
      `;
    }
  }

  const affixPills = affixes.length
    ? `<div class="pills">${affixes.map((affix) => `<span class="pill">${affix}</span>`).join("")}</div>`
    : '<p class="muted">Nessun affisso suggerito.</p>';

  const vcHtml = vcSuggestion
    ? `<p><strong>${vcSuggestion[0]}</strong>: ${formatEntry(vcSuggestion[1])}</p>`
    : '<p class="muted">Nessun adattamento suggerito.</p>';

  const mutationSummary = `T0 → ${mutationT0 ?? "—"}, T1 → ${mutationT1 ?? "—"}`;

  if (controlElements.encounterResult) {
    controlElements.encounterResult.innerHTML = `
      <p class="dice-roll">Bioma: <strong>${biomeName}</strong> · Diff base ${
        biomeDetails.diff_base ?? "—"
      } · Mod ${biomeDetails.mod_biome ?? "—"}</p>
      <div>
        <h4>Affissi consigliati</h4>
        ${affixPills}
      </div>
      <p><strong>Mutazioni rapide:</strong> ${mutationSummary}</p>
      <div>
        <h4>Adattamento VC</h4>
        ${vcHtml}
      </div>
      ${
        frequencyHtml
          ? `<div><h4>Frequenze evento</h4><ul>${frequencyHtml}</ul></div>`
          : ""
      }
      ${synergyHighlight}
    `;
    controlElements.encounterResult.dataset.hasResult = "true";
  }
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rangeContains(rangeLabel, value) {
  const range = parseRangeLabel(rangeLabel);
  if (!range) return false;
  return value >= range.min && value <= range.max;
}

function parseRangeLabel(label) {
  if (!label) return null;
  const normalized = String(label).replace(/[^0-9\-]/g, "");
  if (!normalized) return null;
  const parts = normalized.split("-").map((part) => parseInt(part, 10)).filter(Number.isFinite);
  if (!parts.length) return null;
  if (parts.length === 1) {
    return { min: parts[0], max: parts[0] };
  }
  return { min: Math.min(parts[0], parts[1]), max: Math.max(parts[0], parts[1]) };
}

function pickRandom(items, count = 1, unique = true) {
  if (!Array.isArray(items) || items.length === 0) return [];

  if (!unique || count === 1) {
    const index = Math.floor(Math.random() * items.length);
    return [items[index]];
  }

  const pool = [...items];
  const result = [];
  const limit = Math.min(count, pool.length);
  for (let i = 0; i < limit; i += 1) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
}

function pickWeightedOption(options) {
  if (!options || typeof options !== "object") return null;
  const entries = Object.entries(options).filter(([, value]) => typeof value === "number");
  if (!entries.length) return null;

  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) {
    const [first] = entries;
    return first ? first[0] : null;
  }

  let threshold = Math.random() * total;
  for (const [key, weight] of entries) {
    threshold -= weight;
    if (threshold <= 0) {
      return key;
    }
  }

  const [last] = entries.slice(-1);
  return last ? last[0] : null;
}

function renderRandomTable() {
  const container = document.getElementById("random-list");
  if (!container) return;

  const table = state.data.packs?.random_general_d20;
  if (!Array.isArray(table) || table.length === 0) {
    container.innerHTML = "<p>Nessuna combinazione trovata.</p>";
    return;
  }

  const rows = table
    .map((entry) => {
      const combo = Array.isArray(entry.combo)
        ? `<ul class="inline-list">${entry.combo
            .map((item) => `<li>${formatEntry(item)}</li>`)
            .join("")}</ul>`
        : "—";
      return `
        <tr>
          <td>${entry.range || "—"}</td>
          <td>${entry.pack || "—"}</td>
          <td>${combo}</td>
          <td>${entry.notes || ""}</td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Range</th>
            <th>Pack</th>
            <th>Combo</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderTelemetry() {
  const container = document.getElementById("telemetry-content");
  if (!container) return;

  const telemetry = state.data.telemetry;
  if (!telemetry) {
    container.innerHTML = "<p>Nessun dato disponibile.</p>";
    return;
  }

  const telemetrySettings = telemetry.telemetry || {};
  const windows = telemetrySettings.windows || {};
  const indices = telemetry.indices || {};
  const axes = telemetry.mbti_axes || {};
  const ennea = telemetry.ennea_themes || [];
  const economy = telemetry.pe_economy || {};

  const indicesHtml = Object.entries(indices)
    .map(
      ([name, weights]) => `
        <li>
          <strong>${name}</strong>
          <ul>${Object.entries(weights)
            .map(([metric, value]) => `<li>${metric}: <span>${value}</span></li>`)
            .join("")}</ul>
        </li>
      `
    )
    .join("");

  const axesHtml = Object.entries(axes)
    .map(([axis, details]) => `<li><strong>${axis}</strong>: ${details.formula}</li>`)
    .join("");

  const enneaHtml = ennea
    .map((entry) => `<li><strong>${entry.id}</strong> — ${entry.when}</li>`)
    .join("");

  const economyHtml = Object.entries(economy)
    .map(([key, value]) => `<li><strong>${key}</strong>: ${formatEntry(value)}</li>`)
    .join("");

  container.innerHTML = `
    <div class="telemetry-grid">
      <article class="card">
        <h3>Finestra EMA</h3>
        <p><strong>Alpha:</strong> ${telemetrySettings.ema_alpha ?? "—"}</p>
        <p><strong>Debounce:</strong> ${telemetrySettings.debounce_ms ?? "—"} ms</p>
        <p><strong>Idle threshold:</strong> ${telemetrySettings.idle_threshold_s ?? "—"} s</p>
        <p><strong>Normalizzazione:</strong> ${telemetrySettings.normalization || "—"}</p>
        <h4>Windows</h4>
        <ul>${Object.entries(windows)
          .map(([key, value]) => `<li>${key}: ${formatEntry(value)}</li>`)
          .join("")}</ul>
      </article>
      <article class="card">
        <h3>Indici VC</h3>
        <ul class="nested-list">${indicesHtml}</ul>
      </article>
      <article class="card">
        <h3>Assi MBTI</h3>
        <ul>${axesHtml}</ul>
      </article>
      <article class="card">
        <h3>Temi Enneagramma</h3>
        <ul>${enneaHtml}</ul>
      </article>
      <article class="card">
        <h3>Economia PE</h3>
        <ul>${economyHtml}</ul>
      </article>
    </div>
  `;
}

function renderBiomes() {
  const container = document.getElementById("biomes-grid");
  if (!container) return;

  const biomesData = state.data.biomes;
  if (!biomesData) {
    container.innerHTML = "<p>Nessun dato disponibile.</p>";
    return;
  }

  const biomes = biomesData.biomes || {};
  const biomeCards = Object.entries(biomes)
    .map(([name, details]) => {
      return `
        <article class="card biome-card">
          <h3>${name}</h3>
          <p><strong>Diff. base:</strong> ${details.diff_base ?? "—"}</p>
          <p><strong>Mod. bioma:</strong> ${details.mod_biome ?? "—"}</p>
          <h4>Affissi</h4>
          <ul>${Array.isArray(details.affixes)
            ? details.affixes.map((affix) => `<li>${affix}</li>`).join("")
            : "<li>—</li>"}</ul>
        </article>
      `;
    })
    .join("");

  const vcAdapt = biomesData.vc_adapt || {};
  const vcHtml = Object.entries(vcAdapt)
    .map(
      ([key, value]) => `<li><strong>${key}</strong>: ${formatEntry(value)}</li>`
    )
    .join("");

  const mutations = biomesData.mutations || {};
  const mutationHtml = Object.entries(mutations)
    .map(([key, value]) => `<li><strong>${key}</strong>: ${formatEntry(value)}</li>`)
    .join("");

  const frequencies = biomesData.frequencies || {};
  const freqHtml = Object.entries(frequencies)
    .map(([key, value]) => `<li><strong>${key}</strong>: ${formatEntry(value)}</li>`)
    .join("");

  container.innerHTML = `
    <div class="biome-grid">
      ${biomeCards}
    </div>
    <div class="cards biome-details">
      <article class="card">
        <h3>VC Adapt</h3>
        <ul>${vcHtml}</ul>
      </article>
      <article class="card">
        <h3>Mutazioni</h3>
        <ul>${mutationHtml}</ul>
      </article>
      <article class="card">
        <h3>Frequenze</h3>
        <ul>${freqHtml}</ul>
      </article>
    </div>
  `;
}

function renderSpeciesShowcase() {
  const container = document.getElementById("species-showcase");
  if (!container) return;

  const speciesData = state.data.species;
  if (!speciesData || !speciesData.catalog) {
    container.innerHTML =
      '<div class="species-empty"><p>Carica <code>species.yaml</code> per sbloccare il catalogo di slot e sinergie.</p></div>';
    return;
  }

  const slots = speciesData.catalog.slots || {};
  const slotEntries = Object.entries(slots);
  const synergies = Array.isArray(speciesData.catalog.synergies)
    ? speciesData.catalog.synergies
    : [];
  const speciesList = Array.isArray(speciesData.species) ? speciesData.species : [];
  const moduleTotal = slotEntries.reduce(
    (sum, [, slotModules]) => sum + Object.keys(slotModules || {}).length,
    0
  );

  const metricsHtml = `
    <div class="species-overview">
      <div class="species-metric">
        <span class="label">Slot primari</span>
        <span class="value">${slotEntries.length || "—"}</span>
      </div>
      <div class="species-metric">
        <span class="label">Moduli disponibili</span>
        <span class="value">${moduleTotal || "—"}</span>
      </div>
      <div class="species-metric">
        <span class="label">Trigger sinergici</span>
        <span class="value">${synergies.length || "—"}</span>
      </div>
      <div class="species-metric">
        <span class="label">Specie prototipo</span>
        <span class="value">${speciesList.length || "—"}</span>
      </div>
    </div>
  `;

  const slotCards = slotEntries
    .map(([slotId, slotModules]) => {
      const moduleEntries = Object.entries(slotModules || {});
      const topModules = moduleEntries.slice(0, 4).map(([moduleId, details]) => {
        const name = details?.name || formatLabel(moduleId);
        const description = describeModuleEffects(details?.effects);
        return `<li><strong>${name}</strong><span>${description}</span></li>`;
      });

      const extraCount = moduleEntries.length - topModules.length;
      if (extraCount > 0) {
        topModules.push(`<li class="muted">+${extraCount} moduli aggiuntivi</li>`);
      }

      return `
        <article class="species-card">
          <h3>${formatLabel(slotId)}</h3>
          <p class="slot-meta">${moduleEntries.length} modulo${
            moduleEntries.length === 1 ? "" : "i"
          }</p>
          <ul>${topModules.join("") || '<li class="muted">Nessun modulo configurato</li>'}</ul>
        </article>
      `;
    })
    .join("");

  const globalRules = speciesData.global_rules || {};
  const morphBudget = globalRules.morph_budget?.default_weight_budget;
  const stackingCaps = globalRules.stacking_caps
    ? Object.entries(globalRules.stacking_caps)
        .map(([key, value]) => `${formatLabel(key)} → ${value}`)
        .join(" · ")
    : null;
  const countersReference = Array.isArray(globalRules.counters_reference)
    ? globalRules.counters_reference
    : [];
  const counterSummary = countersReference
    .map((entry) => {
      const counter = formatLabel(entry.counter);
      const counters = Array.isArray(entry.counters)
        ? entry.counters.map(formatLabel).join(", ")
        : "—";
      return `${counter}: ${counters}`;
    })
    .join(" · ");

  const rulesBlock = morphBudget || stackingCaps || counterSummary
    ? `
        <article class="species-card species-rules">
          <h3>Linee guida globali</h3>
          <ul>
            ${
              morphBudget
                ? `<li><strong>Budget morfologico</strong><span>${morphBudget} pt</span></li>`
                : ""
            }
            ${
              stackingCaps
                ? `<li><strong>Stacking caps</strong><span>${stackingCaps}</span></li>`
                : ""
            }
            ${
              counterSummary
                ? `<li><strong>Counter reference</strong><span>${counterSummary}</span></li>`
                : ""
            }
          </ul>
        </article>
      `
    : "";

  const slotsSection = slotEntries.length
    ? `<div class="species-grid">${slotCards}${rulesBlock}</div>`
    : `
        <div class="species-empty">
          <p>Nessun modulo configurato negli slot specie.</p>
        </div>
      `;

  const synergyPreview = synergies.slice(0, 4)
    .map((synergy) => {
      const name = synergy.name || formatLabel(synergy.id);
      const triggers = formatSynergyRequirements(synergy.when_all);
      return `<li><strong>${name}</strong><span class="trigger">${triggers}</span></li>`;
    })
    .join("");

  const synergyExtra = synergies.length > 4
    ? `<p class="muted">+${synergies.length - 4} sinergie aggiuntive nel catalogo.</p>`
    : "";

  const synergySection = synergies.length
    ? `
        <div class="species-synergies">
          <h3>Trigger combinati</h3>
          <ul>${synergyPreview}</ul>
          ${synergyExtra}
        </div>
      `
    : "";

  container.innerHTML = `${metricsHtml}${slotsSection}${synergySection}`;
}

function formatEntry(entry) {
  if (entry == null) return "—";
  if (typeof entry === "string" || typeof entry === "number") return entry;
  if (Array.isArray(entry)) {
    return `<ul>${entry.map((item) => `<li>${formatEntry(item)}</li>`).join("")}</ul>`;
  }
  if (typeof entry === "object") {
    return Object.entries(entry)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  }
  return String(entry);
}

function renderPillGroup(title, values) {
  if (!Array.isArray(values) || values.length === 0) return "";
  const pills = values.map((value) => `<span class="pill">${value}</span>`).join("");
  return `
    <div class="pill-group">
      <h4>${title}</h4>
      <div class="pills">${pills}</div>
    </div>
  `;
}

function renderListBlock(title, values) {
  if (!Array.isArray(values) || values.length === 0) return "";
  return `
    <div class="list-block">
      <h4>${title}</h4>
      <ul>${values.map((value) => `<li>${value}</li>`).join("")}</ul>
    </div>
  `;
}

function setupControlPanel() {
  if (controlElements.runTests) {
    controlElements.runTests.addEventListener("click", runDataTests);
  }

  if (controlElements.fetchForm) {
    controlElements.fetchForm.addEventListener("submit", handleFetchSubmit);
  }

  if (controlElements.fetchFile) {
    controlElements.fetchFile.addEventListener("change", handleFetchFileChange);
  }

  if (controlElements.formSelector) {
    controlElements.formSelector.addEventListener("change", (event) => {
      renderFormDetails(event.target.value);
    });
  }

  if (controlElements.formFilter) {
    controlElements.formFilter.addEventListener("input", (event) => {
      state.formFilter = event.target.value.trim();
      populateFormSelector();
    });
  }

  if (controlElements.rollD20) {
    controlElements.rollD20.addEventListener("click", handleRollD20);
  }

  if (controlElements.rollBias) {
    controlElements.rollBias.addEventListener("click", handleBiasRoll);
  }

  if (controlElements.encounterButton) {
    controlElements.encounterButton.addEventListener("click", handleEncounterGenerate);
  }

  renderFetchPreview();
}

function runDataTests() {
  if (!controlElements.testResults) return;

  if (!state.loadedAt) {
    renderTestResults([
      {
        passed: false,
        label: "Dataset non caricati",
        message: "Carica i dati prima di eseguire i test."
      }
    ]);
    return;
  }

  const tests = [
    {
      id: "packs",
      label: "Pacchetti PI caricati",
      run: () => {
        const packs = state.data.packs;
        const formsCount = packs?.forms ? Object.keys(packs.forms).length : 0;
        return {
          passed: formsCount > 0,
          message: formsCount
            ? `${formsCount} forme disponibili`
            : "Nessuna forma caricata"
        };
      }
    },
    {
      id: "mating",
      label: "Compatibilità forma disponibili",
      run: () => {
        const forms = state.data.packs?.forms || {};
        const compat = state.data.mating?.compat_forme;
        const formCount = Object.keys(forms).length;
        const compatCount = compat ? Object.keys(compat).length : 0;

        if (!formCount) {
          return {
            passed: false,
            message: "Nessuna forma configurata"
          };
        }

        if (!compatCount) {
          return {
            passed: false,
            message: "Nessuna tabella compatibilità caricata"
          };
        }

        const missing = Object.keys(forms).filter((formId) => !compat?.[formId]);
        const hasAll = missing.length === 0;
        const truncatedMissing = missing.slice(0, 5).join(", ");
        const suffix = missing.length > 5 ? "…" : "";

        return {
          passed: hasAll,
          message: hasAll
            ? "Compatibilità presenti per tutte le forme"
            : `Mancano ${missing.length} forme: ${truncatedMissing}${suffix}`
        };
      }
    },
    {
      id: "randomTable",
      label: "Tabella random d20 valida",
      run: () => {
        const table = state.data.packs?.random_general_d20;
        const isValid = Array.isArray(table) && table.every((row) => row.range && row.pack);
        return {
          passed: Boolean(isValid),
          message: isValid
            ? `${table.length} righe con range e pack`
            : "Mancano range o pack nella tabella"
        };
      }
    },
    {
      id: "species",
      label: "Catalogo specie completo",
      run: () => {
        const slots = state.data.species?.catalog?.slots || {};
        const synergies = Array.isArray(state.data.species?.catalog?.synergies)
          ? state.data.species.catalog.synergies
          : [];
        const slotCount = Object.keys(slots).length;
        const moduleCount = Object.values(slots).reduce(
          (sum, slotGroup) => sum + Object.keys(slotGroup || {}).length,
          0
        );
        const hasCatalog = slotCount > 0 && moduleCount > 0;
        return {
          passed: hasCatalog && synergies.length > 0,
          message: hasCatalog
            ? `${slotCount} slot · ${moduleCount} moduli · ${synergies.length} sinergie`
            : "Catalogo specie incompleto"
        };
      }
    },
    {
      id: "piShop",
      label: "Negozio PI configurato",
      run: () => {
        const piShop = state.data.packs?.pi_shop;
        const costs = piShop?.costs ? Object.keys(piShop.costs).length : 0;
        const caps = piShop?.caps ? Object.keys(piShop.caps).length : 0;
        const ready = costs > 0;
        const parts = [];
        if (costs) parts.push(`${costs} costi`);
        if (caps) parts.push(`${caps} caps`);
        const message = parts.length
          ? `${parts.join(", ")} configurati`
          : "Aggiungi costi e limiti al negozio PI";
        return {
          passed: ready,
          message
        };
      }
    },
    {
      id: "telemetry",
      label: "Indici VC presenti",
      run: () => {
        const indices = state.data.telemetry?.indices;
        const count = indices ? Object.keys(indices).length : 0;
        return {
          passed: count > 0,
          message: count
            ? `${count} indici registrati`
            : "Nessun indice configurato"
        };
      }
    },
    {
      id: "biomes",
      label: "Biomi definiti",
      run: () => {
        const biomes = state.data.biomes?.biomes;
        const count = biomes ? Object.keys(biomes).length : 0;
        return {
          passed: count > 0,
          message: count ? `${count} biomi disponibili` : "Nessun bioma trovato"
        };
      }
    }
  ];

  const results = tests.map((test) => {
    try {
      return { ...test.run(), label: test.label };
    } catch (error) {
      return {
        passed: false,
        message: error.message,
        label: test.label
      };
    }
  });

  renderTestResults(results);
}

function renderTestResults(results) {
  const container = controlElements.testResults;
  if (!container) return;

  if (!results.length) {
    container.innerHTML = "<li>Nessun test eseguito.</li>";
    return;
  }

  container.innerHTML = results
    .map((result) => {
      const statusClass = result.passed ? "result-ok" : "result-ko";
      const icon = result.passed ? "✅" : "⚠️";
      return `
        <li class="${statusClass}">
          <span class="result-icon">${icon}</span>
          <div>
            <p class="result-label">${result.label}</p>
            <p class="result-message">${result.message}</p>
          </div>
        </li>
      `;
    })
    .join("");
}

function handleFetchFileChange(event) {
  const input = event.target;
  if (!input || !input.files || input.files.length === 0) {
    return;
  }

  const file = input.files[0];
  if (controlElements.fetchUrl) {
    controlElements.fetchUrl.value = "";
  }

  const sizeLabel = formatFileSize(file.size);
  const message = sizeLabel
    ? `Selezionato file ${file.name} (${sizeLabel}).`
    : `Selezionato file ${file.name}.`;
  setFetchStatus(message, "info");
}

async function handleFetchSubmit(event) {
  event.preventDefault();

  const url = controlElements.fetchUrl?.value?.trim() || "";
  const file = controlElements.fetchFile?.files?.[0];

  if (!url && !file) {
    setFetchStatus("Specifica un URL oppure seleziona un file da analizzare.", "error");
    return;
  }

  try {
    setFetchStatus("Elaborazione in corso…", "loading");
    const parseOptions = {
      allowArchive: pageMode !== PAGE_MODES.MANUAL_FETCH || manualPageState.options.allowArchive,
    };
    const result = file
      ? await parseFetchedFile(file, parseOptions)
      : await parseFetchedUrl(url, parseOptions);

    updateFetchPreview(result);

    if (pageMode === PAGE_MODES.MANUAL_FETCH) {
      handleManualFetchResult(result);
    } else {
      const applied = applyFetchedData(result.data);
      const summaryMessage = result.summary || "Fetch completato.";

      if (applied.length > 0) {
        setFetchStatus(
          `${summaryMessage} Dataset aggiornati: ${applied.join(", ")}.`,
          "success"
        );
      } else if (result.data && typeof result.data === "object") {
        setFetchStatus(
          `${summaryMessage} Nessun dataset riconosciuto automaticamente.`,
          "warning"
        );
      } else {
        setFetchStatus(
          `${summaryMessage} Anteprima disponibile nei riquadri sottostanti.`,
          "info"
        );
      }
    }
  } catch (error) {
    console.error(error);
    setFetchStatus(`Errore durante il fetch: ${error.message}`, "error");
  }
}

function handleManualFetchResult(result) {
  manualPageState.lastResult = result || null;

  renderManualMetadata(result);

  if (manualPageState.options.runDiagnostics) {
    renderManualDiagnostics(runManualDiagnostics(result));
  } else {
    renderManualDiagnostics({ disabled: true });
  }

  let statusVariant = "info";
  let statusMessage = result?.summary || "Analisi completata.";
  let stored = false;

  if (manualPageState.options.autoApply) {
    stored = storeManualSyncPayload(result);
    if (stored) {
      statusVariant = "success";
      statusMessage = `${statusMessage} Sync programmata: apri la dashboard per applicarla.`;
    } else if (result?.data && typeof result.data === "object") {
      statusVariant = "warning";
      statusMessage = `${statusMessage} Impossibile programmare la sync: verifica lo spazio disponibile nel browser.`;
    } else {
      statusVariant = "info";
      statusMessage = `${statusMessage} Nessun dataset strutturato da sincronizzare automaticamente.`;
    }
  } else if (result?.data && typeof result.data === "object") {
    statusMessage = `${statusMessage} Anteprima aggiornata. Abilita la sincronizzazione automatica per inviare i dati alla dashboard.`;
  }

  if (Array.isArray(result?.warnings) && result.warnings.length && statusVariant !== "success") {
    statusVariant = "warning";
  }

  setFetchStatus(statusMessage, statusVariant);
  renderManualSyncPanels();
}

async function parseFetchedUrl(url, options = {}) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Richiesta fallita (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "";
  return interpretFetchedPayload({
    identifier: url,
    arrayBuffer,
    contentType,
    sourceType: "url",
    allowArchive: options.allowArchive !== false,
  });
}

async function parseFetchedFile(file, options = {}) {
  const arrayBuffer = await file.arrayBuffer();
  return interpretFetchedPayload({
    identifier: file.name,
    arrayBuffer,
    contentType: file.type,
    sourceType: "file",
    size: file.size,
    allowArchive: options.allowArchive !== false,
  });
}

async function interpretFetchedPayload({
  identifier,
  arrayBuffer,
  contentType = "",
  sourceType,
  size,
  allowArchive = true,
}) {
  const normalizedType = (contentType || "").toLowerCase();
  const extension = getExtensionFromIdentifier(identifier);
  let sourceLabel = identifier;
  if (sourceType === "file") {
    sourceLabel = `File: ${identifier}`;
  } else if (sourceType === "url") {
    sourceLabel = `URL: ${identifier}`;
  } else if (sourceType === "archive") {
    sourceLabel = `Archivio: ${identifier}`;
  }

  if (allowArchive && (normalizedType.includes("zip") || extension === "zip")) {
    return parseZipArchive({
      identifier,
      arrayBuffer,
      sourceLabel,
    });
  }

  if (extension === "docx" || normalizedType.includes("officedocument")) {
    return parseDocxDocument({ arrayBuffer, sourceLabel, identifier });
  }

  if (extension === "doc" && !normalizedType.includes("xml")) {
    return {
      data: null,
      preview: null,
      summary: "Documento DOC legacy: convertire in DOCX per l'anteprima.",
      format: "doc",
      sourceLabel,
      warnings: [
        "I file .doc non sono supportati direttamente. Convertire il documento in DOCX per analizzarlo.",
      ],
    };
  }

  if (normalizedType.includes("pdf") || extension === "pdf") {
    return parsePdfDocument({ arrayBuffer, sourceLabel, identifier, size });
  }

  const text = decodeBufferToText(arrayBuffer);
  return interpretTextPayload({
    identifier,
    text,
    contentType,
    sourceLabel,
  });
}

function resolveManualDatasetKey(result) {
  const forced = manualPageState.options.targetDataset;
  if (forced) return forced;
  if (result?.detectedKey) return result.detectedKey;

  const data = result?.data;
  if (!data || typeof data !== "object") {
    return null;
  }

  const detected = detectDataKey(data);
  if (detected) {
    return detected;
  }

  const candidates = DATA_SOURCES.map((source) => source.key).filter((key) =>
    Object.prototype.hasOwnProperty.call(data, key)
  );

  if (candidates.length === 1) {
    return candidates[0];
  }

  return null;
}

function renderManualMetadata(result) {
  const container = manualElements.metadata;
  if (!container) return;

  if (!result || (!result.summary && !result.format && !result.data)) {
    container.innerHTML = '<p class="muted">Nessuna analisi ancora eseguita.</p>';
    return;
  }

  const datasetKey = resolveManualDatasetKey(result);
  const datasetLabel = datasetKey ? resolvePreviewLabel(datasetKey) : "Rilevamento automatico";
  const attachmentsCount = Array.isArray(result.attachments) ? result.attachments.length : 0;
  const warningsCount = Array.isArray(result.warnings) ? result.warnings.length : 0;

  const rows = [];
  rows.push({ label: "Sintesi", value: result.summary || "—" });
  rows.push({ label: "Origine", value: result.sourceLabel || "—" });
  rows.push({ label: "Formato", value: result.format ? result.format.toUpperCase() : "—" });
  rows.push({ label: "Dataset stimato", value: datasetLabel });

  if (attachmentsCount) {
    rows.push({ label: "Allegati estratti", value: `${attachmentsCount}` });
  }

  if (warningsCount) {
    rows.push({ label: "Avvisi", value: `${warningsCount}` });
  }

  container.innerHTML = `
    <dl class="metadata-grid">
      ${rows.map((row) => `<div><dt>${row.label}</dt><dd>${row.value}</dd></div>`).join("")}
    </dl>
  `;
}

function runManualDiagnostics(result) {
  if (!result || !result.data || typeof result.data !== "object") {
    return {
      datasetKey: null,
      datasetLabel: "Nessun dataset",
      messages: [
        {
          level: "warning",
          text: "Nessun dataset strutturato rilevato. Carica un file YAML/JSON o seleziona un override.",
        },
      ],
      hasIssues: true,
    };
  }

  const datasetKey = resolveManualDatasetKey(result);
  let datasetPayload = result.data;
  if (datasetKey && datasetPayload && Object.prototype.hasOwnProperty.call(datasetPayload, datasetKey)) {
    datasetPayload = datasetPayload[datasetKey];
  }

  const messages = [];

  switch (datasetKey) {
    case "packs": {
      const forms = datasetPayload?.forms || {};
      if (!Object.keys(forms).length) {
        messages.push({ level: "warning", text: "Mancano forme nel dataset (`forms`)." });
      } else {
        messages.push({ level: "info", text: `${Object.keys(forms).length} forme rilevate.` });
      }
      if (!Array.isArray(datasetPayload?.random_general_d20)) {
        messages.push({ level: "warning", text: "Tabella `random_general_d20` assente o non valida." });
      }
      if (!datasetPayload?.pi_shop) {
        messages.push({ level: "warning", text: "Negozio PI (`pi_shop`) non configurato." });
      }
      break;
    }
    case "telemetry": {
      const indices = datasetPayload?.indices || {};
      if (!Object.keys(indices).length) {
        messages.push({ level: "warning", text: "Nessun indice VC (`indices`) rilevato." });
      } else {
        messages.push({ level: "info", text: `${Object.keys(indices).length} indici VC.` });
      }
      if (!datasetPayload?.mbti_axes) {
        messages.push({ level: "warning", text: "Matrice MBTI (`mbti_axes`) mancante." });
      }
      break;
    }
    case "biomes": {
      const biomes = datasetPayload?.biomes || {};
      if (!Object.keys(biomes).length) {
        messages.push({ level: "warning", text: "Lista biomi vuota o mancante." });
      }
      if (!datasetPayload?.mutations && !datasetPayload?.vc_adapt) {
        messages.push({ level: "warning", text: "Nessuna mutazione/VC adattivo associata ai biomi." });
      }
      break;
    }
    case "mating": {
      const compat = datasetPayload?.compat_forme || {};
      if (!Object.keys(compat).length) {
        messages.push({ level: "warning", text: "Tabella compatibilità (`compat_forme`) mancante." });
      }
      if (!datasetPayload?.base_scores) {
        messages.push({ level: "warning", text: "Valori base (`base_scores`) non definiti." });
      }
      break;
    }
    case "species": {
      const catalog = datasetPayload?.catalog || {};
      const slots = catalog?.slots || {};
      if (!Object.keys(slots).length) {
        messages.push({ level: "warning", text: "Catalogo slot specie vuoto." });
      } else {
        messages.push({
          level: "info",
          text: `${Object.keys(slots).length} slot specie con ${Object.values(slots).reduce(
            (sum, slotGroup) => sum + Object.keys(slotGroup || {}).length,
            0
          )} moduli totali.`,
        });
      }
      if (!Array.isArray(catalog?.synergies) || !catalog.synergies.length) {
        messages.push({ level: "warning", text: "Sinergie (`catalog.synergies`) non impostate." });
      }
      break;
    }
    default: {
      if (!datasetKey) {
        messages.push({
          level: "warning",
          text: "Nessun dataset riconosciuto automaticamente. Usa l'override per forzare la destinazione.",
        });
      }
    }
  }

  if (Array.isArray(result.attachments) && result.attachments.length) {
    messages.push({
      level: "info",
      text: `${result.attachments.length} allegati analizzati dal pacchetto/caricamento.`,
    });
  }

  const hasWarnings = messages.some((item) => item.level === "warning");
  if (!hasWarnings) {
    messages.push({
      level: "success",
      text: "Nessuna criticità evidente: il dataset appare completo per la destinazione scelta.",
    });
  }

  return {
    datasetKey,
    datasetLabel: datasetKey ? resolvePreviewLabel(datasetKey) : "Sorgente generica",
    messages,
    hasIssues: hasWarnings,
  };
}

function renderManualDiagnostics(info) {
  const container = manualElements.diagnostics;
  if (!container) return;

  if (!info) {
    container.innerHTML = '<p class="muted">La diagnostica comparirà qui dopo il prossimo fetch.</p>';
    return;
  }

  if (info.disabled) {
    container.innerHTML = '<p class="muted">Diagnostica disattivata.</p>';
    return;
  }

  const header = `<p class="manual-diagnostics-heading">Dataset analizzato: <strong>${info.datasetLabel || "—"}</strong></p>`;

  if (!info.messages || !info.messages.length) {
    container.innerHTML = `${header}<p class="status success">Nessuna diagnostica disponibile.</p>`;
    return;
  }

  const items = info.messages
    .map((item) => {
      let className = "diag-info";
      if (item.level === "warning") className = "diag-warning";
      else if (item.level === "success") className = "diag-success";
      return `<li class="${className}">${item.text}</li>`;
    })
    .join("");

  container.innerHTML = `${header}<ul class="manual-diagnostics-list">${items}</ul>`;
}

function prepareManualPayloadData(result) {
  if (!result || !result.data || typeof result.data !== "object") {
    return null;
  }

  const target = manualPageState.options.targetDataset;
  const payload = result.data;

  if (!target) {
    return payload;
  }

  if (Object.prototype.hasOwnProperty.call(payload, target)) {
    return { [target]: payload[target] };
  }

  return { [target]: payload };
}

function storeManualSyncPayload(result) {
  if (!manualPageState.options.autoApply) {
    return false;
  }

  const dataToStore = prepareManualPayloadData(result);
  if (!dataToStore || typeof dataToStore !== "object") {
    writeJsonStorage(MANUAL_SYNC_STORAGE_KEY, null);
    return false;
  }

  const datasetKey = resolveManualDatasetKey(result);

  const payload = {
    timestamp: new Date().toISOString(),
    data: dataToStore,
    summary: result?.summary || null,
    sourceLabel: result?.sourceLabel || null,
    format: result?.format || null,
    detectedKey: result?.detectedKey || datasetKey || null,
    targetDataset: manualPageState.options.targetDataset || null,
    runTests: manualPageState.options.autoTests && manualPageState.options.autoApply,
  };

  const success = writeJsonStorage(MANUAL_SYNC_STORAGE_KEY, payload);
  return success;
}

function renderManualSyncPanels() {
  if (pageMode !== PAGE_MODES.MANUAL_FETCH) return;

  const statusElement = manualElements.syncStatus;
  const historyElement = manualElements.syncHistory;
  const pendingElement = manualElements.pendingSummary;

  const history = readJsonStorage(MANUAL_SYNC_HISTORY_KEY);
  const pending = readJsonStorage(MANUAL_SYNC_STORAGE_KEY);

  if (statusElement) {
    if (history) {
      const timestamp = history.timestamp ? new Date(history.timestamp).toLocaleString() : "Data sconosciuta";
      const dataset = Array.isArray(history.appliedKeys) && history.appliedKeys.length
        ? history.appliedKeys.join(", ")
        : "—";
      statusElement.textContent = `Ultima applicazione: ${timestamp} · Dataset: ${dataset}`;
    } else {
      statusElement.textContent = "Nessuna sincronizzazione ancora registrata.";
    }
  }

  if (historyElement) {
    if (!history) {
      historyElement.innerHTML = "";
    } else {
      const timestamp = history.timestamp ? new Date(history.timestamp).toLocaleString() : "Data sconosciuta";
      const dataset = Array.isArray(history.appliedKeys) && history.appliedKeys.length
        ? history.appliedKeys.join(", ")
        : "—";
      const summary = history.summary || "Nessun riepilogo disponibile.";
      const source = history.sourceLabel
        ? `<div><dt>Origine</dt><dd>${history.sourceLabel}</dd></div>`
        : "";

      historyElement.innerHTML = `
        <div><dt>Timestamp</dt><dd>${timestamp}</dd></div>
        <div><dt>Dataset</dt><dd>${dataset}</dd></div>
        <div><dt>Dettaglio</dt><dd>${summary}</dd></div>
        ${source}
      `;
    }
  }

  if (pendingElement) {
    if (!pending || typeof pending !== "object") {
      pendingElement.textContent = "Nessun payload in coda.";
    } else {
      const dataset = pending.targetDataset || pending.detectedKey || "auto";
      const timestamp = pending.timestamp ? new Date(pending.timestamp).toLocaleString() : "pronto";
      const summary = pending.summary || "Payload pronto per l'applicazione.";
      pendingElement.textContent = `${summary} · Dataset: ${dataset} · ${timestamp}`;
    }
  }
}

function loadManualOptionsFromStorage() {
  const stored = readJsonStorage(MANUAL_FLAGS_STORAGE_KEY);
  if (!stored || typeof stored !== "object") {
    return;
  }

  manualPageState.options.allowArchive = stored.allowArchive !== false;
  manualPageState.options.runDiagnostics = stored.runDiagnostics !== false;
  manualPageState.options.autoApply = stored.autoApply !== false;
  manualPageState.options.autoTests = stored.autoTests === true;
  manualPageState.options.targetDataset = stored.targetDataset || "";

  if (!manualPageState.options.autoApply) {
    manualPageState.options.autoTests = false;
  }
}

function persistManualOptions() {
  writeJsonStorage(MANUAL_FLAGS_STORAGE_KEY, { ...manualPageState.options });
}

function syncManualOptionsUI() {
  if (manualElements.optionArchive) {
    manualElements.optionArchive.checked = manualPageState.options.allowArchive;
  }
  if (manualElements.optionDiagnostics) {
    manualElements.optionDiagnostics.checked = manualPageState.options.runDiagnostics;
  }
  if (manualElements.optionAutoApply) {
    manualElements.optionAutoApply.checked = manualPageState.options.autoApply;
  }
  if (manualElements.optionAutoTests) {
    manualElements.optionAutoTests.checked = manualPageState.options.autoTests;
    manualElements.optionAutoTests.disabled = !manualPageState.options.autoApply;
  }
  if (manualElements.targetDataset) {
    manualElements.targetDataset.value = manualPageState.options.targetDataset || "";
  }
}

function attachManualOptionHandlers() {
  if (manualElements.optionArchive) {
    manualElements.optionArchive.addEventListener("change", (event) => {
      manualPageState.options.allowArchive = event.target.checked;
      persistManualOptions();
    });
  }

  if (manualElements.optionDiagnostics) {
    manualElements.optionDiagnostics.addEventListener("change", (event) => {
      manualPageState.options.runDiagnostics = event.target.checked;
      persistManualOptions();
      if (manualPageState.options.runDiagnostics) {
        renderManualDiagnostics(runManualDiagnostics(manualPageState.lastResult));
      } else {
        renderManualDiagnostics({ disabled: true });
      }
    });
  }

  if (manualElements.optionAutoApply) {
    manualElements.optionAutoApply.addEventListener("change", (event) => {
      manualPageState.options.autoApply = event.target.checked;
      if (!manualPageState.options.autoApply) {
        manualPageState.options.autoTests = false;
        if (manualElements.optionAutoTests) {
          manualElements.optionAutoTests.checked = false;
        }
      }
      persistManualOptions();
      syncManualOptionsUI();
      renderManualSyncPanels();
    });
  }

  if (manualElements.optionAutoTests) {
    manualElements.optionAutoTests.addEventListener("change", (event) => {
      manualPageState.options.autoTests = event.target.checked;
      persistManualOptions();
    });
  }

  if (manualElements.targetDataset) {
    manualElements.targetDataset.addEventListener("change", (event) => {
      manualPageState.options.targetDataset = event.target.value || "";
      persistManualOptions();
      if (manualPageState.lastResult) {
        renderManualMetadata(manualPageState.lastResult);
        if (manualPageState.options.runDiagnostics) {
          renderManualDiagnostics(runManualDiagnostics(manualPageState.lastResult));
        }
      }
    });
  }
}

function initManualNotes() {
  if (!manualElements.notes) return;

  let stored = "";
  try {
    stored = window.localStorage?.getItem(MANUAL_NOTES_STORAGE_KEY) || "";
  } catch (error) {
    console.warn("Impossibile leggere gli appunti di ricerca", error);
  }

  manualElements.notes.value = stored;
  manualElements.notes.addEventListener("input", (event) => {
    if (!window.localStorage) return;
    try {
      window.localStorage.setItem(MANUAL_NOTES_STORAGE_KEY, event.target.value);
    } catch (error) {
      console.warn("Impossibile salvare gli appunti di ricerca", error);
    }
  });
}

function initManualChecklist() {
  if (!manualElements.checklistInputs || !manualElements.checklistInputs.length) {
    return;
  }

  const stored = readJsonStorage(MANUAL_CHECKLIST_STORAGE_KEY) || {};

  manualElements.checklistInputs.forEach((input) => {
    const flag = input.dataset.manualFlag;
    if (!flag) return;
    input.checked = Boolean(stored[flag]);
    input.addEventListener("change", () => {
      stored[flag] = input.checked;
      writeJsonStorage(MANUAL_CHECKLIST_STORAGE_KEY, stored);
    });
  });
}

function setupManualFetchPage() {
  manualPageState.lastResult = null;
  setupControlPanel();
  loadManualOptionsFromStorage();
  syncManualOptionsUI();
  attachManualOptionHandlers();
  initManualNotes();
  initManualChecklist();
  renderManualMetadata(null);
  renderManualDiagnostics(null);
  renderManualSyncPanels();

  const pending = readJsonStorage(MANUAL_SYNC_STORAGE_KEY);
  if (pending && controlElements.fetchStatus) {
    const dataset = pending.targetDataset || pending.detectedKey || "auto";
    setFetchStatus(
      `Payload in coda (${dataset}). Verrà applicato automaticamente alla prossima apertura della dashboard principale.`,
      "info"
    );
  }
}

function getExtensionFromIdentifier(identifier = "") {
  if (!identifier) return "";
  const sanitized = identifier.split(/[?#]/)[0] || "";
  const parts = sanitized.split("/");
  const lastSegment = parts[parts.length - 1] || "";
  const match = /\.([^.]+)$/.exec(lastSegment);
  return match ? match[1].toLowerCase() : "";
}

function decodeBufferToText(arrayBuffer) {
  if (!arrayBuffer) return "";
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);
  } catch (error) {
    console.warn("Impossibile decodificare il buffer come testo UTF-8", error);
    return "";
  }
}

function summariseStructuredData(data, format) {
  if (Array.isArray(data)) {
    return `${format.toUpperCase()} con ${data.length} elementi`;
  }
  if (data && typeof data === "object") {
    const keys = Object.keys(data);
    const head = keys.slice(0, 6).join(", ");
    const suffix = keys.length > 6 ? ", …" : "";
    return `${format.toUpperCase()} con ${keys.length} chiavi (${head}${suffix})`;
  }
  if (data === null || data === undefined) {
    return `${format.toUpperCase()} vuoto`;
  }
  return `${format.toUpperCase()} (${typeof data})`;
}

function summarisePlainText(text, label = "Contenuto testuale") {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return {
      summary: `${label} (vuoto)`,
      preview: "(nessun contenuto)",
    };
  }

  const lines = trimmed.split(/\r?\n/);
  const summary = `${label} (${lines.length} righe, ${trimmed.length} caratteri)`;
  const slice = trimmed.slice(0, 800);
  const preview = slice + (trimmed.length > slice.length ? "\n…" : "");
  return { summary, preview };
}

function summariseMarkdown(text) {
  const trimmed = text || "";
  const headingMatches = trimmed.match(/^#{1,6}\s+/gm) || [];
  const words = (trimmed.match(/\w+/g) || []).length;
  const { summary: baseSummary, preview } = summarisePlainText(trimmed, "Markdown");
  const enrichedSummary = `${baseSummary} · ${headingMatches.length} heading · ${words} parole`;
  return { summary: enrichedSummary, preview };
}

function summariseHtml(text, identifier) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    const title = doc.querySelector("title")?.textContent?.trim();
    const description = doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim();
    const bodyText = doc.body?.textContent?.replace(/\s+/g, " ")?.trim() || "";
    const snippet = bodyText.slice(0, 800) + (bodyText.length > 800 ? "\n…" : "");
    const summaryParts = ["Pagina HTML"];
    if (title) {
      summaryParts.push(`titolo: ${title}`);
    }
    if (description) {
      summaryParts.push(description);
    }
    if (!title && !description && identifier) {
      summaryParts.push(identifier);
    }
    return {
      summary: summaryParts.join(" · "),
      preview: snippet || "(nessun testo rilevato)",
      text: bodyText,
    };
  } catch (error) {
    console.warn("Impossibile interpretare il markup HTML", error);
    return summarisePlainText(text, "HTML");
  }
}

function interpretTextPayload({ identifier, text, contentType = "", sourceLabel }) {
  const normalizedType = (contentType || "").toLowerCase();
  const extension = getExtensionFromIdentifier(identifier);
  const trimmed = text?.trim() || "";
  const warnings = [];
  if (!trimmed) {
    warnings.push("Il contenuto recuperato è vuoto.");
  }

  const looksLikeJson =
    normalizedType.includes("json") ||
    extension === "json" ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[");
  const looksLikeYaml =
    normalizedType.includes("yaml") ||
    normalizedType.includes("yml") ||
    extension === "yaml" ||
    extension === "yml";
  const looksLikeMarkdown =
    normalizedType.includes("markdown") || extension === "md" || extension === "markdown";
  const looksLikeHtml =
    normalizedType.includes("html") ||
    extension === "html" ||
    /^<!?(doctype html|html)/i.test(trimmed);

  if (looksLikeJson) {
    try {
      const data = JSON.parse(text);
      const summary = summariseStructuredData(data, "json");
      return {
        data,
        preview: data,
        summary,
        format: "json",
        sourceLabel,
        warnings,
        detectedKey: detectDataKey(data),
      };
    } catch (error) {
      warnings.push(`JSON non valido: ${error.message}`);
    }
  }

  if (looksLikeYaml) {
    try {
      const data = jsyaml.load(text) ?? {};
      const summary = summariseStructuredData(data, "yaml");
      return {
        data,
        preview: data,
        summary,
        format: "yaml",
        sourceLabel,
        warnings,
        detectedKey: detectDataKey(data),
      };
    } catch (error) {
      warnings.push(`YAML non valido: ${error.message}`);
    }
  }

  if (!looksLikeJson && !looksLikeYaml) {
    try {
      const data = JSON.parse(text);
      const summary = summariseStructuredData(data, "json");
      return {
        data,
        preview: data,
        summary,
        format: "json",
        sourceLabel,
        warnings,
        detectedKey: detectDataKey(data),
      };
    } catch (jsonError) {
      try {
        const data = jsyaml.load(text);
        if (data !== undefined) {
          const summary = summariseStructuredData(data, "yaml");
          return {
            data,
            preview: data,
            summary,
            format: "yaml",
            sourceLabel,
            warnings,
            detectedKey: detectDataKey(data),
          };
        }
      } catch (yamlError) {
        warnings.push("Contenuto non interpretabile come JSON/YAML.");
      }
    }
  }

  if (looksLikeHtml) {
    const details = summariseHtml(text, identifier);
    return {
      data: null,
      preview: details.preview,
      summary: details.summary,
      format: "html",
      sourceLabel,
      warnings,
    };
  }

  if (looksLikeMarkdown) {
    const details = summariseMarkdown(text);
    return {
      data: null,
      preview: details.preview,
      summary: details.summary,
      format: "markdown",
      sourceLabel,
      warnings,
    };
  }

  const details = summarisePlainText(text);
  return {
    data: null,
    preview: details.preview,
    summary: details.summary,
    format: "text",
    sourceLabel,
    warnings,
  };
}

function inferFormatFromExtension(name) {
  const ext = getExtensionFromIdentifier(name);
  if (!ext) return "sconosciuto";
  return ext;
}

function mergeDatasetPayload(existing, incoming) {
  if (!existing) {
    return Array.isArray(incoming) ? [...incoming] : { ...incoming };
  }

  if (Array.isArray(existing) && Array.isArray(incoming)) {
    return [...existing, ...incoming];
  }

  if (existing && typeof existing === "object" && incoming && typeof incoming === "object") {
    return { ...existing, ...incoming };
  }

  return incoming;
}

async function parseZipArchive({ identifier, arrayBuffer, sourceLabel }) {
  if (typeof JSZip === "undefined") {
    throw new Error("Supporto ZIP non disponibile: libreria JSZip non caricata.");
  }

  let zip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (error) {
    throw new Error(`Archivio ZIP non valido: ${error.message}`);
  }

  const attachments = [];
  const warnings = [];
  const aggregated = {};
  const structuredPayloads = [];

  const files = Object.values(zip.files).filter((entry) => !entry.dir);
  for (const entry of files) {
    let buffer;
    try {
      buffer = await entry.async("arraybuffer");
    } catch (error) {
      attachments.push({
        name: entry.name,
        format: "errore",
        summary: `Impossibile leggere il file: ${error.message}`,
      });
      warnings.push(`Errore durante la lettura di ${entry.name}: ${error.message}`);
      continue;
    }

    let childResult;
    try {
      childResult = await interpretFetchedPayload({
        identifier: entry.name,
        arrayBuffer: buffer,
        contentType: "",
        sourceType: "archive",
        allowArchive: false,
      });
    } catch (error) {
      attachments.push({
        name: entry.name,
        format: "errore",
        summary: error.message,
      });
      warnings.push(`Analisi fallita per ${entry.name}: ${error.message}`);
      continue;
    }

    const datasetKey = childResult.detectedKey || (childResult.data ? detectDataKey(childResult.data) : null);
    if (datasetKey && childResult.data && typeof childResult.data === "object") {
      aggregated[datasetKey] = mergeDatasetPayload(aggregated[datasetKey], childResult.data);
    }

    if (childResult.data && typeof childResult.data === "object") {
      structuredPayloads.push(childResult.data);
    }

    attachments.push({
      name: entry.name,
      format: childResult.format || inferFormatFromExtension(entry.name),
      summary: childResult.summary || "Analisi completata",
      dataset: datasetKey || undefined,
    });
  }

  const datasetKeys = Object.keys(aggregated);
  let data = null;
  if (datasetKeys.length === 1) {
    data = aggregated[datasetKeys[0]];
  } else if (datasetKeys.length > 1) {
    data = aggregated;
  } else if (structuredPayloads.length === 1) {
    data = structuredPayloads[0];
  }

  const summaryParts = [`Archivio ZIP con ${files.length} file`];
  if (datasetKeys.length) {
    summaryParts.push(`dataset rilevati: ${datasetKeys.join(", ")}`);
  }
  const summary = summaryParts.join(" · ");

  return {
    data,
    preview: data ?? null,
    summary,
    format: "zip",
    sourceLabel,
    attachments,
    warnings,
  };
}

async function parseDocxDocument({ arrayBuffer, sourceLabel, identifier }) {
  if (typeof JSZip === "undefined") {
    throw new Error("Supporto DOCX non disponibile: libreria JSZip non caricata.");
  }

  let zip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (error) {
    throw new Error(`Documento DOCX non valido: ${error.message}`);
  }

  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    return {
      data: null,
      preview: null,
      summary: "Documento DOCX privo di contenuto testuale.",
      format: "docx",
      sourceLabel,
      warnings: ["Impossibile trovare word/document.xml nel pacchetto DOCX."],
    };
  }

  const xmlText = await documentFile.async("string");
  const text = extractTextFromDocx(xmlText);
  const { summary, preview } = summarisePlainText(text || "", "Documento DOCX");
  return {
    data: null,
    preview,
    summary,
    format: "docx",
    sourceLabel,
    warnings: text ? [] : ["Nessun testo significativo rilevato nel documento."],
  };
}

function extractTextFromDocx(xmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "application/xml");
    const nodes = doc.getElementsByTagName("w:t");
    const parts = [];
    for (let i = 0; i < nodes.length; i += 1) {
      const value = nodes[i].textContent;
      if (value) {
        parts.push(value);
      }
    }
    return parts.join(" ").replace(/\s+/g, " ").trim();
  } catch (error) {
    console.warn("Impossibile estrarre il testo dal documento DOCX", error);
    return xmlText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
}

function parsePdfDocument({ arrayBuffer, sourceLabel, identifier, size }) {
  const sizeLabel = typeof size === "number" ? formatFileSize(size) : null;
  const summaryParts = ["Documento PDF"];
  if (sizeLabel) {
    summaryParts.push(sizeLabel);
  } else if (arrayBuffer) {
    summaryParts.push(`${arrayBuffer.byteLength} B`);
  }
  summaryParts.push(identifier);

  return {
    data: null,
    preview: null,
    summary: summaryParts.join(" · "),
    format: "pdf",
    sourceLabel,
    warnings: [
      "L'anteprima dei PDF non è disponibile nell'interfaccia web. Usa lo script di indagine per estrarre il testo.",
    ],
  };
}

function updateFetchPreview(result) {
  const previewPayload = result?.preview ?? result?.data ?? null;
  manualPreviewState.raw = previewPayload ?? null;
  const sections = buildPreviewSections(previewPayload);

  if (Array.isArray(result?.attachments) && result.attachments.length > 0) {
    const attachmentItems = result.attachments.map((item) => ({
      file: item.name,
      formato: item.format,
      dataset: item.dataset || "—",
      dettagli: item.summary,
    }));
    const attachmentSection = createPreviewSection("estratti", attachmentItems);
    if (attachmentSection) {
      sections.push(attachmentSection);
    }
  }

  manualPreviewState.sections = sections;
  manualPreviewState.sectionIndex = 0;
  manualPreviewState.pageIndex = 0;
  manualPreviewState.summary = result?.summary || "";
  manualPreviewState.sourceLabel = result?.sourceLabel || "";
  manualPreviewState.format = result?.format || "";
  manualPreviewState.warnings = Array.isArray(result?.warnings)
    ? result.warnings.filter(Boolean)
    : [];
  renderFetchPreview();
}

function renderFetchPreview() {
  const container = controlElements.fetchPreview;
  if (!container) return;

  const body = controlElements.fetchPreviewBody;
  const emptyState = controlElements.fetchPreviewEmpty;
  const content = controlElements.fetchPreviewContent;
  const pagination = controlElements.fetchPreviewPagination;
  const tabs = controlElements.fetchPreviewTabs;
  const summaryElement = controlElements.fetchPreviewSummary;
  const warningsElement = controlElements.fetchPreviewWarnings;
  const sections = manualPreviewState.sections;

  if (!body || !emptyState || !content || !pagination || !tabs) {
    const fallback = sections.length
      ? sections[manualPreviewState.sectionIndex]?.pages?.[manualPreviewState.pageIndex || 0]?.data
      : manualPreviewState.raw;
    container.textContent = formatPreviewData(fallback);
    return;
  }

  const summaryParts = [];
  if (manualPreviewState.summary) {
    summaryParts.push(manualPreviewState.summary);
  }
  if (manualPreviewState.format) {
    summaryParts.push(`Formato: ${manualPreviewState.format}`);
  }
  if (manualPreviewState.sourceLabel) {
    summaryParts.push(manualPreviewState.sourceLabel);
  }

  if (summaryElement) {
    if (summaryParts.length) {
      summaryElement.textContent = summaryParts.join(" · ");
      summaryElement.hidden = false;
    } else {
      summaryElement.textContent = "";
      summaryElement.hidden = true;
    }
  }

  if (warningsElement) {
    if (manualPreviewState.warnings.length) {
      warningsElement.innerHTML = manualPreviewState.warnings
        .map((warning) => `<li>${warning}</li>`)
        .join("");
      warningsElement.hidden = false;
    } else {
      warningsElement.innerHTML = "";
      warningsElement.hidden = true;
    }
  }

  const showBody =
    sections.length > 0 || summaryParts.length > 0 || manualPreviewState.warnings.length > 0;

  body.hidden = !showBody;
  emptyState.hidden = showBody;

  if (!sections.length) {
    tabs.innerHTML = "";
    content.textContent = "";
    pagination.innerHTML = "";
    pagination.hidden = true;
    if (!showBody) {
      emptyState.textContent = "(nessun contenuto)";
    } else {
      emptyState.textContent = "";
    }
    return;
  }

  body.hidden = false;
  emptyState.hidden = true;

  manualPreviewState.sectionIndex = Math.min(
    manualPreviewState.sectionIndex,
    sections.length - 1
  );
  const currentSection = sections[manualPreviewState.sectionIndex];
  manualPreviewState.pageIndex = Math.min(
    manualPreviewState.pageIndex,
    Math.max(0, currentSection.pages.length - 1)
  );
  const currentPage =
    currentSection.pages[manualPreviewState.pageIndex] || currentSection.pages[0];

  renderPreviewTabs(sections);
  content.textContent = formatPreviewData(currentPage?.data);
  renderPreviewPagination(currentSection, currentPage);
}

function buildPreviewSections(payload) {
  if (payload === undefined) {
    return [];
  }

  if (Array.isArray(payload)) {
    const sections = [];
    const arraySection = createPreviewSection("items", payload);
    if (arraySection) {
      sections.push(arraySection);
    }
    const rawSection = createRawPreviewSection(payload);
    if (rawSection) {
      sections.push(rawSection);
    }
    return sections;
  }

  if (payload && typeof payload === "object") {
    const sections = [];
    const usedKeys = new Set();

    PREVIEW_SECTION_PRIORITY.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        const section = createPreviewSection(key, payload[key]);
        if (section) {
          sections.push(section);
          usedKeys.add(key);
        }
      }
    });

    const remainingSections = Object.entries(payload)
      .filter(([key]) => !usedKeys.has(key))
      .map(([key, value]) => createPreviewSection(key, value))
      .filter(Boolean)
      .sort((a, b) => PREVIEW_LABEL_COLLATOR.compare(a.label, b.label));

    sections.push(...remainingSections);

    const rawSection = createRawPreviewSection(payload);
    if (rawSection) {
      sections.push(rawSection);
    }

    return sections;
  }

  const rawSection = createRawPreviewSection(payload);
  return rawSection ? [rawSection] : [];
}

function createPreviewSection(key, value) {
  if (value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    const totalItems = value.length;
    const pageSize = getPreviewPageSize(key, totalItems);
    const pages = [];

    if (!totalItems) {
      pages.push({ index: 0, data: [], rangeLabel: "0 elementi" });
    } else {
      for (let start = 0; start < totalItems; start += pageSize) {
        const end = Math.min(start + pageSize, totalItems);
        pages.push({
          index: pages.length,
          data: value.slice(start, end),
          rangeLabel: `Elementi ${start + 1}-${end} di ${totalItems}`,
        });
      }
    }

    return {
      key,
      label: resolvePreviewLabel(key),
      type: "array",
      totalItems,
      pageSize,
      pages,
    };
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    const totalItems = entries.length;
    const pageSize = getPreviewPageSize(key, totalItems);
    const pages = [];

    if (!totalItems) {
      pages.push({ index: 0, data: {}, rangeLabel: "0 voci" });
    } else {
      for (let start = 0; start < totalItems; start += pageSize) {
        const end = Math.min(start + pageSize, totalItems);
        const pageEntries = entries.slice(start, end);
        pages.push({
          index: pages.length,
          data: Object.fromEntries(pageEntries),
          rangeLabel: `Voci ${start + 1}-${end} di ${totalItems}`,
        });
      }
    }

    return {
      key,
      label: resolvePreviewLabel(key),
      type: "object",
      totalItems,
      pageSize,
      pages,
    };
  }

  return {
    key,
    label: resolvePreviewLabel(key),
    type: "primitive",
    totalItems: value === null || value === "" ? 0 : 1,
    pageSize: 1,
    pages: [
      {
        index: 0,
        data: value,
        rangeLabel: null,
      },
    ],
  };
}

function createRawPreviewSection(payload) {
  if (payload === undefined) {
    return null;
  }

  let totalItems = 0;
  if (Array.isArray(payload)) {
    totalItems = payload.length;
  } else if (payload && typeof payload === "object") {
    totalItems = Object.keys(payload).length;
  } else if (payload !== null) {
    totalItems = 1;
  }

  return {
    key: "__raw__",
    label: "Snapshot completo",
    type: "raw",
    totalItems,
    pageSize: Number.MAX_SAFE_INTEGER,
    pages: [
      {
        index: 0,
        data: payload,
        rangeLabel: null,
      },
    ],
  };
}

function getPreviewPageSize(key, totalItems) {
  const override = PREVIEW_PAGE_SIZES[key];
  const base = typeof override === "number" && override > 0 ? override : PREVIEW_PAGE_SIZE_DEFAULT;
  if (typeof totalItems === "number" && totalItems > 0) {
    return Math.max(1, Math.min(base, totalItems));
  }
  return Math.max(1, base);
}

function resolvePreviewLabel(key) {
  if (key === "__raw__") {
    return "Snapshot completo";
  }
  return PREVIEW_SECTION_LABELS[key] || formatLabel(key);
}

function renderPreviewTabs(sections) {
  const tabs = controlElements.fetchPreviewTabs;
  if (!tabs) return;

  tabs.innerHTML = "";

  sections.forEach((section, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preview-tab";
    button.setAttribute("role", "tab");
    if (index === manualPreviewState.sectionIndex) {
      button.classList.add("active");
      button.setAttribute("aria-selected", "true");
    } else {
      button.setAttribute("aria-selected", "false");
    }

    const labelSpan = document.createElement("span");
    labelSpan.className = "preview-tab-label";
    labelSpan.textContent = section.label;
    button.appendChild(labelSpan);

    if (
      section.key !== "__raw__" &&
      typeof section.totalItems === "number" &&
      (section.type === "array" || section.type === "object")
    ) {
      const count = document.createElement("span");
      count.className = "preview-tab-count";
      count.textContent = section.totalItems;
      button.appendChild(count);
    }

    button.addEventListener("click", () => {
      if (manualPreviewState.sectionIndex === index) return;
      manualPreviewState.sectionIndex = index;
      manualPreviewState.pageIndex = 0;
      renderFetchPreview();
    });

    tabs.appendChild(button);
  });
}

function renderPreviewPagination(section, page) {
  const pagination = controlElements.fetchPreviewPagination;
  if (!pagination) return;

  if (!section || section.pages.length <= 1) {
    pagination.innerHTML = "";
    pagination.hidden = true;
    return;
  }

  pagination.hidden = false;
  pagination.innerHTML = "";

  const prevButton = document.createElement("button");
  prevButton.type = "button";
  prevButton.className = "preview-page-btn";
  prevButton.textContent = "Precedente";
  prevButton.disabled = manualPreviewState.pageIndex === 0;
  prevButton.addEventListener("click", () => {
    if (manualPreviewState.pageIndex === 0) return;
    manualPreviewState.pageIndex -= 1;
    renderFetchPreview();
  });

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "preview-page-btn";
  nextButton.textContent = "Successiva";
  nextButton.disabled =
    manualPreviewState.pageIndex >= section.pages.length - 1;
  nextButton.addEventListener("click", () => {
    if (manualPreviewState.pageIndex >= section.pages.length - 1) return;
    manualPreviewState.pageIndex += 1;
    renderFetchPreview();
  });

  const info = document.createElement("span");
  info.className = "preview-page-info";
  const parts = [`Pagina ${manualPreviewState.pageIndex + 1} di ${section.pages.length}`];
  if (page?.rangeLabel) {
    parts.push(page.rangeLabel);
  }
  info.textContent = parts.join(" · ");

  pagination.append(prevButton, info, nextButton);
}

function formatPreviewData(value) {
  if (value === undefined) {
    return "(non disponibile)";
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

function applyFetchedData(payload) {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const updatedKeys = [];

  DATA_SOURCES.forEach((source) => {
    if (Object.prototype.hasOwnProperty.call(payload, source.key)) {
      state.data[source.key] = payload[source.key];
      updatedKeys.push(source.key);
    }
  });

  if (updatedKeys.length === 0) {
    const detectedKey = detectDataKey(payload);
    if (detectedKey) {
      state.data[detectedKey] = payload;
      updatedKeys.push(detectedKey);
    }
  }

  if (updatedKeys.length > 0) {
    state.loadedAt = new Date();
    renderAll();
    const sourceLabel = state.dataBase ? ` · sorgente dati: ${state.dataBase}` : "";
    setTimestamp(
      `Ultimo aggiornamento: ${state.loadedAt.toLocaleString()}${sourceLabel} (fetch manuale)`
    );
    if (controlElements.testResults && controlElements.testResults.childElementCount > 0) {
      runDataTests();
    }
  }

  return updatedKeys;
}

function renderManualSyncInfo(history) {
  if (!controlElements.manualSyncLast || !controlElements.manualSyncSummary) {
    return;
  }

  if (!history) {
    controlElements.manualSyncLast.textContent = "Mai eseguita";
    controlElements.manualSyncSummary.textContent = "Nessuna sincronizzazione ricevuta.";
    return;
  }

  const timestamp = history.timestamp ? new Date(history.timestamp) : null;
  controlElements.manualSyncLast.textContent = timestamp
    ? timestamp.toLocaleString()
    : "Data sconosciuta";

  const parts = [];
  if (history.summary) {
    parts.push(history.summary);
  }
  if (Array.isArray(history.appliedKeys) && history.appliedKeys.length) {
    parts.push(`Dataset: ${history.appliedKeys.join(", ")}`);
  }
  if (history.sourceLabel) {
    parts.push(history.sourceLabel);
  }

  controlElements.manualSyncSummary.textContent = parts.join(" · ") || "Sync completata.";
}

function consumePendingManualSync() {
  if (pageMode !== PAGE_MODES.DASHBOARD) {
    return;
  }

  const payload = readJsonStorage(MANUAL_SYNC_STORAGE_KEY);
  if (!payload || typeof payload !== "object") {
    const history = readJsonStorage(MANUAL_SYNC_HISTORY_KEY);
    renderManualSyncInfo(history);
    return;
  }

  if (!payload.data || typeof payload.data !== "object") {
    console.warn("Payload di sincronizzazione manuale non valido", payload);
    writeJsonStorage(MANUAL_SYNC_STORAGE_KEY, null);
    renderManualSyncInfo(readJsonStorage(MANUAL_SYNC_HISTORY_KEY));
    return;
  }

  writeJsonStorage(MANUAL_SYNC_STORAGE_KEY, null);

  const appliedKeys = applyFetchedData(payload.data);

  const history = {
    timestamp: new Date().toISOString(),
    summary: payload.summary || null,
    sourceLabel: payload.sourceLabel || null,
    format: payload.format || null,
    appliedKeys,
  };

  writeJsonStorage(MANUAL_SYNC_HISTORY_KEY, history);

  if (payload.runTests && controlElements.runTests) {
    runDataTests();
  }

  renderManualSyncInfo(history);
}

function detectDataKey(payload) {
  if (!payload || typeof payload !== "object") return null;

  if (payload.forms || payload.random_general_d20) return "packs";
  if (payload.telemetry || payload.indices || payload.mbti_axes) return "telemetry";
  if (payload.biomes || payload.vc_adapt || payload.mutations) return "biomes";
  if (payload.compat_forme || payload.base_scores) return "mating";
  if (payload.catalog || payload.species || payload.global_rules) return "species";

  return null;
}

function setFetchStatus(message, variant) {
  if (!controlElements.fetchStatus) return;
  controlElements.fetchStatus.textContent = message;
  controlElements.fetchStatus.dataset.status = variant || "info";
}

document.addEventListener("DOMContentLoaded", () => {
  pageMode = detectPageMode();
  setupDomReferences();

  if (pageMode === PAGE_MODES.DASHBOARD) {
    const reloadButton = document.getElementById("reload-data");
    if (reloadButton) {
      reloadButton.addEventListener("click", () => loadAllData());
    }
    setupControlPanel();
    renderManualSyncInfo(readJsonStorage(MANUAL_SYNC_HISTORY_KEY));
    loadAllData();
  } else if (pageMode === PAGE_MODES.MANUAL_FETCH) {
    setupManualFetchPage();
  }
});
