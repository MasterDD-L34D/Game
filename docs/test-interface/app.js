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
  items: "Elementi"
};
const PREVIEW_LABEL_COLLATOR = new Intl.Collator("it", { sensitivity: "base" });

const metricsElements = {};
const controlElements = {};
const infoElements = {};

function formatLabel(value) {
  if (!value) return "";
  return String(value)
    .split(/[._]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
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
  metricsElements.forms = document.querySelector('[data-metric="forms"]');
  metricsElements.random = document.querySelector('[data-metric="random"]');
  metricsElements.indices = document.querySelector('[data-metric="indices"]');
  metricsElements.biomes = document.querySelector('[data-metric="biomes"]');
  metricsElements.speciesSlots = document.querySelector('[data-metric="species-slots"]');
  metricsElements.speciesSynergies = document.querySelector('[data-metric="species-synergies"]');
  metricsElements.timestamp = document.getElementById("last-updated");

  controlElements.runTests = document.getElementById("run-tests");
  controlElements.testResults = document.getElementById("test-results");
  controlElements.fetchForm = document.getElementById("fetch-form");
  controlElements.fetchUrl = document.getElementById("fetch-url");
  controlElements.fetchStatus = document.getElementById("fetch-status");
  controlElements.fetchPreview = document.getElementById("fetch-preview");
  controlElements.fetchPreviewBody = document.getElementById("fetch-preview-body");
  controlElements.fetchPreviewTabs = document.getElementById("fetch-preview-tabs");
  controlElements.fetchPreviewContent = document.getElementById("fetch-preview-content");
  controlElements.fetchPreviewPagination = document.getElementById("fetch-preview-pagination");
  controlElements.fetchPreviewEmpty = document.getElementById("fetch-preview-empty");
  controlElements.formSelector = document.getElementById("form-selector");
  controlElements.formFilter = document.getElementById("form-filter");
  controlElements.rollD20 = document.getElementById("roll-d20");
  controlElements.rollBias = document.getElementById("roll-bias");
  controlElements.rollD20Result = document.getElementById("roll-d20-result");
  controlElements.biasResult = document.getElementById("bias-roll-result");
  controlElements.encounterButton = document.getElementById("generate-encounter");
  controlElements.encounterResult = document.getElementById("encounter-result");

  infoElements.dataSource = document.getElementById("data-source");
  infoElements.piShop = document.getElementById("pi-shop-content");
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

async function handleFetchSubmit(event) {
  event.preventDefault();
  if (!controlElements.fetchUrl) return;

  const url = controlElements.fetchUrl.value.trim();
  if (!url) {
    setFetchStatus("Specifica un URL da cui recuperare i dati.", "error");
    return;
  }

  try {
    setFetchStatus("Recupero in corso…", "loading");
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Richiesta fallita (${response.status})`);
    }

    const text = await response.text();
    const payload = parseFetchedContent(url, text, response.headers.get("content-type"));
    updateFetchPreview(payload);
    const applied = applyFetchedData(payload);

    if (applied.length > 0) {
      setFetchStatus(
        `Aggiornati i dataset: ${applied.join(", ")}.`,
        "success"
      );
    } else {
      setFetchStatus(
        "Fetch riuscito ma nessun dataset riconosciuto da aggiornare.",
        "warning"
      );
    }
  } catch (error) {
    console.error(error);
    setFetchStatus(`Errore durante il fetch: ${error.message}`, "error");
  }
}

function parseFetchedContent(url, text, contentType = "") {
  const normalizedType = (contentType || "").toLowerCase();
  const looksLikeYaml =
    normalizedType.includes("yaml") ||
    normalizedType.includes("yml") ||
    url.endsWith(".yaml") ||
    url.endsWith(".yml");

  if (looksLikeYaml) {
    return jsyaml.load(text);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    try {
      return jsyaml.load(text);
    } catch (yamlError) {
      throw new Error("Impossibile interpretare la risposta come JSON o YAML valido.");
    }
  }
}

function updateFetchPreview(payload) {
  manualPreviewState.raw = payload ?? null;
  manualPreviewState.sections = buildPreviewSections(payload);
  manualPreviewState.sectionIndex = 0;
  manualPreviewState.pageIndex = 0;
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
  const sections = manualPreviewState.sections;

  if (!body || !emptyState || !content || !pagination || !tabs) {
    const fallback = sections.length
      ? sections[manualPreviewState.sectionIndex]?.pages?.[manualPreviewState.pageIndex || 0]?.data
      : manualPreviewState.raw;
    container.textContent = formatPreviewData(fallback);
    return;
  }

  if (!sections.length) {
    body.hidden = true;
    emptyState.hidden = false;
    emptyState.textContent = "(nessun contenuto)";
    tabs.innerHTML = "";
    content.textContent = "";
    pagination.innerHTML = "";
    pagination.hidden = true;
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
  setupDomReferences();
  document
    .getElementById("reload-data")
    .addEventListener("click", () => loadAllData());
  setupControlPanel();
  loadAllData();
});
