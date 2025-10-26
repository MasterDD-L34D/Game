import {
  loadPackCatalog,
  manualLoadCatalog,
  getPackRootCandidates,
  PACK_PATH,
} from "./pack-data.js";

const elements = {
  form: document.getElementById("generator-form"),
  flags: document.getElementById("flags"),
  roles: document.getElementById("roles"),
  tags: document.getElementById("tags"),
  nBiomi: document.getElementById("nBiomi"),
  biomeGrid: document.getElementById("biome-grid"),
  traitGrid: document.getElementById("trait-grid"),
  seedGrid: document.getElementById("seed-grid"),
  status: document.getElementById("generator-status"),
  summaryContainer: document.getElementById("generator-summary"),
  summaryCounts: {
    biomes: document.querySelector("[data-summary=\"biomes\"]"),
    species: document.querySelector("[data-summary=\"species\"]"),
    seeds: document.querySelector("[data-summary=\"seeds\"]"),
  },
  lastAction: document.getElementById("generator-last-action"),
  logList: document.getElementById("generator-log"),
  logEmpty: document.getElementById("generator-log-empty"),
  exportMeta: document.getElementById("generator-export-meta"),
  exportList: document.getElementById("generator-export-list"),
  exportEmpty: document.getElementById("generator-export-empty"),
  exportPreview: document.getElementById("generator-export-preview"),
  exportPreviewEmpty: document.getElementById("generator-preview-empty"),
  exportPreviewJson: document.getElementById("generator-preview-json"),
  exportPreviewYaml: document.getElementById("generator-preview-yaml"),
  exportPreviewJsonDetails: document.getElementById("generator-preview-json-details"),
  exportPreviewYamlDetails: document.getElementById("generator-preview-yaml-details"),
};

const PACK_ROOT_CANDIDATES = getPackRootCandidates();
const EXPORT_BASE_FOLDER = `${PACK_PATH}out/generator/`;
const STORAGE_KEYS = {
  activityLog: "evo-generator-activity-log",
};

const state = {
  data: null,
  traitRegistry: null,
  traitReference: null,
  traitsIndex: new Map(),
  traitDetailsIndex: new Map(),
  hazardRegistry: null,
  hazardsIndex: new Map(),
  activityLog: [],
  lastFilters: { flags: [], roles: [], tags: [] },
  pick: {
    ecosystem: {},
    biomes: [],
    species: {},
    seeds: [],
    exportSlug: null,
  },
};

let packContext = null;
let resolvedCatalogUrl = null;
let resolvedPackRoot = null;
let packDocsBase = null;
let cachedStorage = null;
let storageChecked = false;

const TRAIT_CATEGORY_LABELS = {
  biomi_estremi: "Biomi estremi",
  rete_connessa: "Rete connessa",
  avanzati_specializzati: "Cluster avanzati",
};

function applyCatalogContext(data, context) {
  packContext = context ?? null;
  resolvedCatalogUrl = context?.catalogUrl ?? null;
  resolvedPackRoot = context?.resolvedBase ?? null;
  packDocsBase = context?.docsBase ?? null;
  state.data = data;
  populateFilters(data);
}

function calculatePickMetrics() {
  const biomes = state.pick?.biomes ?? [];
  const speciesBuckets = state.pick?.species ?? {};
  const seeds = state.pick?.seeds ?? [];
  const biomeCount = Array.isArray(biomes) ? biomes.length : 0;
  const speciesCount = Object.values(speciesBuckets).reduce(
    (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
    0
  );
  const seedCount = Array.isArray(seeds) ? seeds.length : 0;
  return { biomeCount, speciesCount, seedCount };
}

function setStatus(message, tone = "info") {
  const now = new Date();
  if (elements.status) {
    elements.status.textContent = message;
    elements.status.dataset.tone = tone;
  }
  if (elements.lastAction) {
    const formatted = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    elements.lastAction.textContent = `Ultimo aggiornamento: ${formatted}`;
    elements.lastAction.dataset.tone = tone;
    elements.lastAction.title = now.toLocaleString("it-IT");
  }
  recordActivity(message, tone, now);
}

function updateSummaryCounts() {
  const { biomeCount, speciesCount, seedCount } = calculatePickMetrics();

  elements.summaryCounts?.biomes?.textContent = biomeCount;
  elements.summaryCounts?.species?.textContent = speciesCount;
  elements.summaryCounts?.seeds?.textContent = seedCount;

  if (elements.summaryContainer) {
    const hasResults = biomeCount + speciesCount + seedCount > 0;
    elements.summaryContainer.dataset.hasResults = hasResults ? "true" : "false";
  }

  renderExportManifest();
}

function getActivityStorage() {
  if (storageChecked) {
    return cachedStorage;
  }
  storageChecked = true;
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      cachedStorage = null;
      return cachedStorage;
    }
    const testKey = "__generator_log_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    cachedStorage = window.localStorage;
  } catch (error) {
    console.warn("LocalStorage non disponibile per il monitor del generatore", error);
    cachedStorage = null;
  }
  return cachedStorage;
}

function persistActivityLog() {
  const storage = getActivityStorage();
  if (!storage) return;
  try {
    const serialisable = state.activityLog.map((entry) => ({
      message: entry.message,
      tone: entry.tone,
      timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
    }));
    storage.setItem(STORAGE_KEYS.activityLog, JSON.stringify(serialisable));
  } catch (error) {
    console.warn("Impossibile salvare il registro attività", error);
  }
}

function restoreActivityLog() {
  const storage = getActivityStorage();
  if (!storage) return;
  try {
    const raw = storage.getItem(STORAGE_KEYS.activityLog);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    state.activityLog = parsed
      .map((entry) => {
        if (!entry?.message) return null;
        const timestamp = entry.timestamp ? new Date(entry.timestamp) : new Date();
        return {
          message: entry.message,
          tone: entry.tone ?? "info",
          timestamp,
        };
      })
      .filter(Boolean)
      .slice(0, 20);
  } catch (error) {
    console.warn("Impossibile ripristinare il registro attività", error);
  }
}

function recordActivity(message, tone = "info", timestamp = new Date()) {
  if (!message) return;
  const entry = {
    message,
    tone,
    timestamp: timestamp instanceof Date ? timestamp : new Date(timestamp),
  };
  state.activityLog.unshift(entry);
  state.activityLog = state.activityLog.slice(0, 20);
  persistActivityLog();
  renderActivityLog();
}

function renderActivityLog() {
  const list = elements.logList;
  const empty = elements.logEmpty;
  if (!list) return;

  list.innerHTML = "";
  const entries = state.activityLog ?? [];
  const hasEntries = entries.length > 0;
  list.hidden = !hasEntries;
  if (empty) {
    empty.hidden = hasEntries;
  }

  if (!hasEntries) {
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "generator-log__item";
    item.dataset.tone = entry.tone ?? "info";

    const time = document.createElement("p");
    time.className = "generator-log__time";
    time.textContent = entry.timestamp.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const messageText = document.createElement("p");
    messageText.className = "generator-log__message";
    messageText.textContent = entry.message;

    item.append(time, messageText);
    list.appendChild(item);
  });
}

function ensureExportSlug() {
  if (state.pick.exportSlug) {
    return state.pick.exportSlug;
  }
  const base = state.pick.ecosystem?.id || randomId("ecos");
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const slug = slugify(`${base}-${stamp}`);
  state.pick.exportSlug = slug || randomId("ecos");
  return state.pick.exportSlug;
}

function renderExportPreview(payload) {
  const container = elements.exportPreview;
  const empty = elements.exportPreviewEmpty;
  if (!container || !empty) return;

  const hasPayload = Boolean(payload);
  container.hidden = !hasPayload;
  empty.hidden = hasPayload;

  if (!hasPayload) {
    if (elements.exportPreviewJson) elements.exportPreviewJson.textContent = "";
    if (elements.exportPreviewYaml) elements.exportPreviewYaml.textContent = "";
    if (elements.exportPreviewJsonDetails) elements.exportPreviewJsonDetails.open = false;
    if (elements.exportPreviewYamlDetails) elements.exportPreviewYamlDetails.open = false;
    return;
  }

  const jsonDetails = elements.exportPreviewJsonDetails;
  const yamlDetails = elements.exportPreviewYamlDetails;
  const jsonWasOpen = Boolean(jsonDetails?.open);
  const yamlWasOpen = Boolean(yamlDetails?.open);

  if (elements.exportPreviewJson) {
    elements.exportPreviewJson.textContent = JSON.stringify(payload, null, 2);
  }
  if (elements.exportPreviewYaml) {
    elements.exportPreviewYaml.textContent = toYAML(payload);
  }

  if (jsonDetails) jsonDetails.open = jsonWasOpen;
  if (yamlDetails) yamlDetails.open = yamlWasOpen;
}

function renderExportManifest(filters = state.lastFilters) {
  const list = elements.exportList;
  const empty = elements.exportEmpty;
  const meta = elements.exportMeta;
  if (!list || !empty || !meta) return;

  list.innerHTML = "";

  const { biomeCount, speciesCount, seedCount } = calculatePickMetrics();
  const hasContent = biomeCount + speciesCount + seedCount > 0;

  list.hidden = !hasContent;
  empty.hidden = hasContent;

  if (!hasContent) {
    meta.textContent = "Genera un ecosistema per preparare il manifest dei file.";
    renderExportPreview(null);
    return;
  }

  const slug = ensureExportSlug();
  const folder = EXPORT_BASE_FOLDER;
  const filterSummary = summariseFilters(filters ?? state.lastFilters ?? {});
  const ecosystemLabel = state.pick.ecosystem?.label ?? "Ecosistema sintetico";

  meta.innerHTML = `Cartella consigliata: <code>${folder}</code> · ${
    filterSummary ? `Filtri: ${filterSummary}.` : "Nessun filtro attivo."
  } · Anteprima disponibile qui sotto.`;

  const suggestions = [
    {
      name: `${slug}.json`,
      format: "JSON",
      description: `Dump completo dell'ecosistema "${ecosystemLabel}" con ${biomeCount} biomi, ${speciesCount} specie e ${seedCount} seed.`,
    },
    {
      name: `${slug}.yaml`,
      format: "YAML",
      description: `Manifesto YAML pronto per commit in ${folder}, utile per revisioni manuali o pipeline esterne.`,
    },
  ];

  suggestions.forEach((suggestion) => {
    const item = document.createElement("li");
    item.className = "generator-export";

    const title = document.createElement("h4");
    title.className = "generator-export__title";
    title.append(document.createTextNode(suggestion.name));
    const format = document.createElement("span");
    format.className = "generator-export__format";
    format.textContent = suggestion.format;
    title.appendChild(format);

    const description = document.createElement("p");
    description.className = "generator-export__description";
    description.textContent = suggestion.description;

    const path = document.createElement("p");
    path.className = "generator-export__path";
    path.textContent = `${folder}${suggestion.name}`;

    item.append(title, description, path);
    list.appendChild(item);
  });

  renderExportPreview(exportPayload(filters));
}

function getSelectedValues(select) {
  return Array.from(select?.selectedOptions ?? []).map((opt) => opt.value);
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sample(array) {
  if (!array.length) return null;
  const index = Math.floor(Math.random() * array.length);
  return array[index];
}

function pickMany(array, n) {
  if (!array?.length || n <= 0) return [];
  if (n >= array.length) return [...array];
  const pool = shuffle(array);
  return pool.slice(0, n);
}

function titleCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function uniqueById(items) {
  const seen = new Map();
  items.forEach((item) => {
    if (!item?.id) return;
    if (!seen.has(item.id)) {
      seen.set(item.id, item);
    }
  });
  return Array.from(seen.values());
}

function randomId(prefix = "synt") {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${suffix}`;
}

function combineNames(primaryName, secondaryName) {
  const firstTokens = String(primaryName || "Alpha")
    .split(/\s+/)
    .filter(Boolean);
  const secondTokens = String(secondaryName || "Beta")
    .split(/\s+/)
    .filter(Boolean);
  const first = firstTokens[0] || "Neo";
  const last = secondTokens.length ? secondTokens[secondTokens.length - 1] : "Synth";
  return `${first} ${last}`;
}

function mixFlags(primary = {}, secondary = {}) {
  const result = { ...primary };
  Object.entries(secondary).forEach(([key, value]) => {
    if (typeof value === "boolean") {
      result[key] = Boolean(value || result[key]);
    } else if (value && !result[key]) {
      result[key] = value;
    }
  });
  return result;
}

function combineTags(primary = [], secondary = []) {
  const merged = new Set();
  primary.forEach((tag) => merged.add(tag));
  secondary.forEach((tag) => merged.add(tag));
  if (!merged.size) {
    merged.add("ibrido");
  }
  return Array.from(merged);
}

function getTraitDetails(traitId) {
  if (!(state.traitDetailsIndex instanceof Map)) {
    return null;
  }
  return state.traitDetailsIndex.get(traitId) ?? null;
}

function traitLabel(traitId) {
  const info = getTraitDetails(traitId);
  if (info?.label) {
    return info.label;
  }
  if (typeof traitId === "string") {
    return titleCase(traitId);
  }
  return traitId;
}

function createChipElement(value) {
  const chip = document.createElement("span");
  chip.className = "chip";
  const info = getTraitDetails(value);
  chip.textContent = info?.label ?? value;
  chip.dataset.traitId = value;
  const tooltip = [];
  if (info?.usage) tooltip.push(`Uso: ${info.usage}`);
  if (info?.family) tooltip.push(`Famiglia: ${info.family}`);
  if (info?.mutation) tooltip.push(`Mutazione: ${info.mutation}`);
  if (info?.selectiveDrive) tooltip.push(`Spinta: ${info.selectiveDrive}`);
  if (info?.fme) tooltip.push(`FME: ${info.fme}`);
  if (info?.weakness) tooltip.push(`Debolezza: ${info.weakness}`);
  if (info?.synergy?.length) {
    tooltip.push(`Sinergie: ${info.synergy.map((id) => traitLabel(id)).join(", ")}`);
  }
  if (info?.conflict?.length) {
    tooltip.push(`Conflitti: ${info.conflict.map((id) => traitLabel(id)).join(", ")}`);
  }
  if (tooltip.length) {
    chip.title = tooltip.join("\n");
  }
  return chip;
}

function inferThreatTierFromRole(role = "", flags = {}) {
  if (flags.apex) return 4;
  if (flags.threat) return 3;
  if (flags.keystone) return 3;
  if (/predatore_terziario/.test(role)) return 4;
  if (/predatore/.test(role)) return 3;
  if (/evento/.test(role)) return 2;
  if (/minaccia/.test(role)) return 3;
  if (/detritivoro|erbivoro|prede/.test(role)) return 1;
  return 2;
}

function tierOf(species) {
  if (species?.syntheticTier) {
    return Math.max(1, Math.min(species.syntheticTier, 5));
  }
  const raw = species?.balance?.threat_tier ?? "T1";
  const parsed = parseInt(String(raw).replace(/\D/g, ""), 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.max(1, Math.min(parsed, 5));
}

function ensureOption(select, value, label = value) {
  if (!select) return;
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
}

function collectFlags(data) {
  const flagSet = new Set();
  data.species.forEach((sp) => {
    Object.entries(sp.flags ?? {}).forEach(([flag]) => {
      flagSet.add(flag);
    });
  });
  return Array.from(flagSet).sort((a, b) => a.localeCompare(b));
}

function collectRoles(data) {
  const roleSet = new Set();
  data.species.forEach((sp) => {
    if (sp.role_trofico) {
      roleSet.add(sp.role_trofico);
    }
  });
  return Array.from(roleSet).sort((a, b) => a.localeCompare(b));
}

function collectTags(data) {
  const tagSet = new Set();
  data.species.forEach((sp) => {
    (sp.functional_tags ?? []).forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

function populateFilters(data) {
  elements.flags.innerHTML = "";
  elements.roles.innerHTML = "";
  elements.tags.innerHTML = "";

  collectFlags(data).forEach((flag) => ensureOption(elements.flags, flag));
  collectRoles(data).forEach((role) => ensureOption(elements.roles, role));
  collectTags(data).forEach((tag) => ensureOption(elements.tags, tag));
}

function indexTraitRegistry(registry) {
  const map = new Map();
  if (!registry?.rules?.length) {
    return map;
  }

  registry.rules.forEach((rule) => {
    const classId = rule.when?.biome_class;
    if (!classId) return;
    const entry = map.get(classId) || {
      traits: new Set(),
      effects: {},
      jobs: new Set(),
      meta: null,
      rules: [],
    };
    (rule.suggest?.traits ?? []).forEach((trait) => entry.traits.add(trait));
    Object.entries(rule.suggest?.effects ?? {}).forEach(([key, value]) => {
      entry.effects[key] = value;
    });
    (rule.suggest?.jobs_bias ?? []).forEach((job) => entry.jobs.add(job));
    entry.rules.push(rule);
    if (rule.meta) {
      entry.meta = { ...(entry.meta ?? {}), ...rule.meta };
    }
    map.set(classId, entry);
  });

  return map;
}

function normalizeTraitList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.length);
  }
  return [];
}

function indexTraitDetails(catalog) {
  const map = new Map();
  if (!catalog?.traits) {
    return map;
  }

  Object.entries(catalog.traits).forEach(([traitId, raw]) => {
    if (!traitId) return;
    const usage = raw?.uso_funzione ?? raw?.usage ?? null;
    const family = raw?.famiglia_tipologia ?? raw?.family ?? null;
    const mutation = raw?.mutazione_indotta ?? raw?.mutation ?? null;
    const selectiveDrive = raw?.spinta_selettiva ?? raw?.selective_drive ?? null;
    const fme = raw?.fattore_mantenimento_energetico ?? raw?.fme ?? null;
    const weakness = raw?.debolezza ?? raw?.weakness ?? null;
    const synergy = normalizeTraitList(raw?.sinergie ?? raw?.synergy);
    const conflict = normalizeTraitList(raw?.conflitti ?? raw?.conflict);
    const entry = {
      id: traitId,
      label: raw?.label ?? titleCase(traitId),
      usage,
      family,
      mutation,
      selectiveDrive,
      fme,
      weakness,
      synergy,
      conflict,
    };
    map.set(traitId, entry);
  });

  return map;
}

function formatEffects(effects = {}) {
  const entries = Object.entries(effects);
  if (!entries.length) return null;
  return entries
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

function setTraitRegistry(registry) {
  state.traitRegistry = registry ?? null;
  state.traitsIndex = indexTraitRegistry(registry);
  renderTraitExpansions();
}

function setTraitReference(catalog) {
  state.traitReference = catalog ?? null;
  state.traitDetailsIndex = indexTraitDetails(catalog);
  renderTraitExpansions();
}

function indexHazardRegistry(registry) {
  const map = new Map();
  if (!registry?.hazards) return map;

  Object.entries(registry.hazards).forEach(([hazardId, info]) => {
    map.set(hazardId, {
      id: hazardId,
      requires_any_of: Array.from(info?.requires_any_of ?? []),
      effect: info?.effect ?? null,
      label: info?.label ?? null,
    });
  });

  return map;
}

function setHazardRegistry(registry) {
  state.hazardRegistry = registry ?? null;
  state.hazardsIndex = indexHazardRegistry(registry);
  renderTraitExpansions();
}

function describeHazards(hazardIds = []) {
  if (!hazardIds?.length) return null;

  const summaryParts = [];
  const detailParts = [];

  hazardIds.forEach((hazardId) => {
    const name = titleCase(hazardId);
    const entry = state.hazardsIndex.get(hazardId);
    if (!entry) {
      summaryParts.push(`${name} (?)`);
      detailParts.push(`${name}: definizione mancante nel registro hazard.`);
      return;
    }

    summaryParts.push(name);
    const notes = [];
    if (entry.requires_any_of?.length) {
      notes.push(`cap: ${entry.requires_any_of.join(" / ")}`);
    }
    if (entry.effect) {
      notes.push(entry.effect);
    }
    if (notes.length) {
      detailParts.push(`${name}: ${notes.join(" — ")}`);
    }
  });

  return {
    summary: summaryParts.join(", "),
    details: detailParts.join(" · "),
  };
}

function gatherTraitInfoForBiome(biome) {
  if (!biome || !(state.traitsIndex instanceof Map)) {
    return null;
  }

  const aggregate = (entry) => ({
    traits: Array.from(entry?.traits ?? []).sort((a, b) => a.localeCompare(b)),
    jobs: Array.from(entry?.jobs ?? []).sort((a, b) => a.localeCompare(b)),
    effects: { ...(entry?.effects ?? {}) },
    description: entry?.meta?.description ?? null,
    meta: entry?.meta ?? null,
  });

  if (!biome.synthetic) {
    const entry = state.traitsIndex.get(biome.id);
    if (!entry) return null;
    return aggregate(entry);
  }

  const traitSet = new Set();
  const jobSet = new Set();
  const effects = {};
  const descriptions = [];

  (biome.parents ?? []).forEach((parent) => {
    const entry = state.traitsIndex.get(parent.id);
    if (!entry) return;
    entry.traits.forEach((trait) => traitSet.add(trait));
    entry.jobs.forEach((job) => jobSet.add(job));
    Object.assign(effects, entry.effects);
    if (entry.meta?.description) {
      descriptions.push(`${titleCase(parent.id)}: ${entry.meta.description}`);
    }
  });

  if (!traitSet.size) return null;

  return {
    traits: Array.from(traitSet).sort((a, b) => a.localeCompare(b)),
    jobs: Array.from(jobSet).sort((a, b) => a.localeCompare(b)),
    effects,
    description: descriptions.join(" · ") || null,
    meta: null,
  };
}

function buildTraitBlock(info, { synthetic = false } = {}) {
  if (!info?.traits?.length) return null;
  const details = document.createElement("details");
  details.className = "trait-block";
  details.open = false;

  const summary = document.createElement("summary");
  summary.textContent = synthetic
    ? `Tratti ambientali ereditati (${info.traits.length})`
    : `Tratti ambientali suggeriti (${info.traits.length})`;
  details.appendChild(summary);

  const chipList = document.createElement("div");
  chipList.className = "chip-list chip-list--compact";
  const sortedTraitsForChips = [...info.traits].sort((a, b) => traitLabel(a).localeCompare(traitLabel(b)));
  sortedTraitsForChips.forEach((trait) => {
    chipList.appendChild(createChipElement(trait));
  });
  details.appendChild(chipList);

  if (info.meta?.expansion) {
    const expansion = document.createElement("p");
    expansion.className = "form__hint";
    expansion.textContent = `Espansione: ${titleCase(info.meta.expansion)}`;
    details.appendChild(expansion);
  }

  if (info.meta?.notes) {
    const notes = document.createElement("p");
    notes.className = "form__hint";
    notes.textContent = info.meta.notes;
    details.appendChild(notes);
  }

  if (info.description) {
    const desc = document.createElement("p");
    desc.className = "form__hint";
    desc.textContent = info.description;
    details.appendChild(desc);
  }

  const detailList = document.createElement("dl");
  detailList.className = "trait-details";
  const orderedTraits = [...info.traits].sort((a, b) => traitLabel(a).localeCompare(traitLabel(b)));
  orderedTraits.forEach((trait) => {
    const traitInfo = getTraitDetails(trait);
    if (!traitInfo) return;
    const pieces = [];
    if (traitInfo.usage) pieces.push(`Uso: ${traitInfo.usage}`);
    if (traitInfo.fme) pieces.push(`FME: ${traitInfo.fme}`);
    if (traitInfo.family) pieces.push(`Famiglia: ${traitInfo.family}`);
    if (traitInfo.selectiveDrive) pieces.push(`Spinta: ${traitInfo.selectiveDrive}`);
    if (traitInfo.mutation) pieces.push(`Mutazione: ${traitInfo.mutation}`);
    if (traitInfo.synergy?.length) {
      pieces.push(`Sinergie: ${traitInfo.synergy.map((id) => traitLabel(id)).join(", ")}`);
    }
    if (traitInfo.conflict?.length) {
      pieces.push(`Conflitti: ${traitInfo.conflict.map((id) => traitLabel(id)).join(", ")}`);
    }
    if (traitInfo.weakness) pieces.push(`Debolezza: ${traitInfo.weakness}`);
    if (!pieces.length) return;
    const term = document.createElement("dt");
    term.className = "trait-details__term";
    term.textContent = traitInfo.label ?? traitLabel(trait);
    detailList.appendChild(term);
    const desc = document.createElement("dd");
    desc.className = "trait-details__desc";
    desc.textContent = pieces.join(" · ");
    detailList.appendChild(desc);
  });
  if (detailList.children.length) {
    details.appendChild(detailList);
  }

  if (info.jobs?.length) {
    const jobs = document.createElement("p");
    jobs.className = "form__hint";
    jobs.textContent = `Bias ruoli: ${info.jobs.join(", ")}`;
    details.appendChild(jobs);
  }

  const effectsSummary = formatEffects(info.effects);
  if (effectsSummary) {
    const eff = document.createElement("p");
    eff.className = "form__hint";
    eff.textContent = `Effetti suggeriti: ${effectsSummary}`;
    details.appendChild(eff);
  }

  return details;
}

function renderTraitExpansions() {
  const container = elements.traitGrid;
  if (!container) return;
  container.innerHTML = "";

  if (!(state.traitsIndex instanceof Map) || !state.traitsIndex.size) {
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "Carica il catalogo per vedere i set di tratti ambientali.";
    container.appendChild(placeholder);
    return;
  }

  const orderedEntries = [];
  const seen = new Set();
  (state.traitRegistry?.rules ?? []).forEach((rule) => {
    if (!rule.meta?.category) return;
    const classId = rule.when?.biome_class;
    if (!classId || seen.has(classId)) return;
    const entry = state.traitsIndex.get(classId);
    if (!entry) return;
    orderedEntries.push({ classId, entry });
    seen.add(classId);
  });

  if (!orderedEntries.length) {
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "Nessun set di tratti ambientali avanzati registrato.";
    container.appendChild(placeholder);
    return;
  }

  orderedEntries.forEach(({ classId, entry }) => {
    const card = document.createElement("article");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = titleCase(classId ?? "Bioma sconosciuto");
    card.appendChild(title);

    const metaParts = [];
    const category = TRAIT_CATEGORY_LABELS[entry.meta?.category] ?? entry.meta?.category;
    if (category) metaParts.push(category);
    if (entry.meta?.network) metaParts.push(`Ecosistema: ${entry.meta.network}`);
    if (entry.meta?.cohort) metaParts.push(`Cluster: ${entry.meta.cohort}`);
    if (entry.meta?.expansion) metaParts.push(`Espansione: ${titleCase(entry.meta.expansion)}`);
    let hazardDetails = null;
    const hazardInfo = describeHazards(entry.meta?.hazard_profile ?? []);
    if (hazardInfo) {
      metaParts.push(`Hazard: ${hazardInfo.summary}`);
      hazardDetails = hazardInfo.details;
    }
    const meta = document.createElement("p");
    meta.className = "form__hint";
    meta.textContent = metaParts.join(" · ") || "Set di tratti ambientali";
    card.appendChild(meta);

    if (hazardDetails) {
      const hazardNote = document.createElement("p");
      hazardNote.className = "form__hint";
      hazardNote.textContent = hazardDetails;
      card.appendChild(hazardNote);
    }

    if (entry.meta?.notes) {
      const note = document.createElement("p");
      note.className = "form__hint";
      note.textContent = entry.meta.notes;
      card.appendChild(note);
    }

    if (entry.meta?.description) {
      const desc = document.createElement("p");
      desc.textContent = entry.meta.description;
      card.appendChild(desc);
    }

    const traitList = document.createElement("div");
    traitList.className = "chip-list chip-list--compact";
    Array.from(entry.traits)
      .sort((a, b) => traitLabel(a).localeCompare(traitLabel(b)))
      .forEach((trait) => {
        traitList.appendChild(createChipElement(trait));
      });
    card.appendChild(traitList);

    const effectsSummary = formatEffects(entry.effects ?? {});
    if (effectsSummary) {
      const eff = document.createElement("p");
      eff.className = "form__hint";
      eff.textContent = `Effetti: ${effectsSummary}`;
      card.appendChild(eff);
    }

    const jobBias = Array.from(entry.jobs ?? [])
      .filter((job) => typeof job === "string")
      .sort((a, b) => a.localeCompare(b));
    if (jobBias.length) {
      const jobsEl = document.createElement("p");
      jobsEl.className = "form__hint";
      jobsEl.textContent = `Bias ruoli: ${jobBias.join(", ")}`;
      card.appendChild(jobsEl);
    }

    container.appendChild(card);
  });
}

const CONNECTION_TYPES = ["corridor", "trophic_spillover", "seasonal_bridge"];
const SEASONALITY = [
  "primavera",
  "estate",
  "autunno",
  "inverno",
  "episodico",
  "multistagionale",
];

const ENCOUNTER_BLUEPRINTS = [
  {
    id: "scout",
    label: "Pattuglia rapida",
    summary: "Piccolo gruppo mobile per ingaggi d'avanscoperta.",
    minSize: 2,
    targetSize: 3,
    priorities: ["threat", "bridge"],
  },
  {
    id: "strike",
    label: "Assalto mirato",
    summary: "Forza d'attacco centrata su predatori e specie chiave.",
    minSize: 3,
    targetSize: 4,
    priorities: ["apex", "keystone", "threat"],
  },
  {
    id: "gauntlet",
    label: "Crisi apex",
    summary: "Scenario culminante con il massimo della pressione ecologica.",
    minSize: 4,
    targetSize: 5,
    priorities: ["apex", "keystone", "threat", "bridge"],
  },
];

function synthesiseBiome(parents) {
  const parentIds = parents.map((parent) => parent.id);
  const displayName = parents.map((parent) => titleCase(parent.id)).join(" / ");
  const idBase = slugify(`${parentIds.join("-")}-${randomId("bio")}`);
  const sourceSpecies = uniqueById(
    parents.flatMap((parent) =>
      (parent.species ?? []).map((sp) => ({ ...sp, source_biome: parent.id }))
    )
  );

  const counts = sourceSpecies.reduce(
    (acc, sp) => {
      if (sp.flags?.apex) acc.apex += 1;
      if (sp.flags?.keystone) acc.keystone += 1;
      if (sp.flags?.bridge) acc.bridge += 1;
      if (sp.flags?.threat) acc.threat += 1;
      if (sp.flags?.event) acc.event += 1;
      return acc;
    },
    { apex: 0, keystone: 0, bridge: 0, threat: 0, event: 0 }
  );

  const functionalGroups = new Set();
  sourceSpecies.forEach((sp) => {
    (sp.functional_tags ?? []).forEach((tag) => functionalGroups.add(tag));
  });

  return {
    id: idBase || randomId("biome"),
    label: `Bioma sintetico ${displayName}`,
    synthetic: true,
    parents: parents.map((parent) => ({
      id: parent.id,
      label: titleCase(parent.id),
      path: parent.path ?? null,
    })),
    species: sourceSpecies,
    manifest: {
      species_counts: counts,
      functional_groups_present: Array.from(functionalGroups),
      sources: parentIds,
    },
  };
}

function generateSyntheticBiomes(baseBiomes, count) {
  if (!baseBiomes?.length) return [];
  const result = [];
  for (let i = 0; i < count; i += 1) {
    const parentCount = Math.min(3, Math.max(2, Math.floor(Math.random() * 3) + 2));
    const parents = pickMany(baseBiomes, Math.min(parentCount, baseBiomes.length));
    result.push(synthesiseBiome(parents));
  }
  return result;
}

function synthesiseConnections(biomes) {
  if (!biomes.length) return [];
  if (biomes.length === 1) {
    return [
      {
        from: biomes[0].id.toUpperCase(),
        to: biomes[0].id.toUpperCase(),
        type: "nested_loop",
        resistance: 0.5,
        seasonality: "continuo",
        notes: "Bioma autosufficiente generato proceduralmente.",
      },
    ];
  }
  const connections = [];
  const shuffled = shuffle(biomes);
  for (let i = 0; i < shuffled.length; i += 1) {
    const current = shuffled[i];
    const next = shuffled[(i + 1) % shuffled.length];
    if (!next) continue;
    const type = sample(CONNECTION_TYPES) ?? "corridor";
    const seasonality = sample(SEASONALITY) ?? "episodico";
    connections.push({
      from: current.id.toUpperCase(),
      to: next.id.toUpperCase(),
      type,
      resistance: Math.round((0.3 + Math.random() * 0.5) * 100) / 100,
      seasonality,
      notes: `Connessione sintetica derivata da ${
        current.parents?.map((p) => p.id).join("+") ?? "sorgenti ignote"
      } verso ${next.parents?.map((p) => p.id).join("+") ?? "target ignoto"}.`,
    });
  }
  return connections;
}

function resolvePackHref(relativePath) {
  if (!relativePath) return relativePath;
  if (packContext?.resolveDocHref) {
    try {
      return packContext.resolveDocHref(relativePath);
    } catch (error) {
      console.warn("Impossibile risolvere il percorso tramite resolveDocHref", relativePath, error);
    }
  }
  if (packDocsBase) {
    try {
      return new URL(relativePath, packDocsBase).toString();
    } catch (error) {
      console.warn("Impossibile risolvere il percorso tramite packDocsBase", relativePath, error);
    }
  }
  if (packContext?.resolvePackHref) {
    try {
      return packContext.resolvePackHref(relativePath);
    } catch (error) {
      console.warn("Impossibile risolvere il percorso tramite resolvePackHref", relativePath, error);
    }
  }
  if (resolvedPackRoot) {
    try {
      return new URL(relativePath, resolvedPackRoot).toString();
    } catch (error) {
      console.warn("Impossibile risolvere il percorso tramite resolvedPackRoot", relativePath, error);
    }
  }
  return relativePath;
}

function currentFilters() {
  const filters = {
    flags: getSelectedValues(elements.flags),
    roles: getSelectedValues(elements.roles),
    tags: getSelectedValues(elements.tags),
  };
  state.lastFilters = filters;
  return filters;
}

function summariseFilters(filters) {
  const segments = [];
  if (filters.flags?.length) {
    segments.push(`flag ${filters.flags.join(", ")}`);
  }
  if (filters.roles?.length) {
    segments.push(`ruoli ${filters.roles.join(", ")}`);
  }
  if (filters.tags?.length) {
    segments.push(`tag ${filters.tags.join(", ")}`);
  }
  return segments.length ? segments.join(" · ") : "nessun filtro attivo";
}

function matchesFlags(species, requiredFlags) {
  if (!requiredFlags.length) return true;
  const flags = species.flags ?? {};
  return requiredFlags.every((flag) => Boolean(flags[flag]));
}

function matchesRoles(species, requiredRoles) {
  if (!requiredRoles.length) return true;
  return requiredRoles.includes(species.role_trofico ?? "");
}

function matchesTags(species, requiredTags) {
  if (!requiredTags.length) return true;
  const tags = species.functional_tags ?? [];
  return requiredTags.every((tag) => tags.includes(tag));
}

function filteredPool(biome, filters) {
  const { flags, roles, tags } = filters;
  return biome.species.filter(
    (sp) => matchesFlags(sp, flags) && matchesRoles(sp, roles) && matchesTags(sp, tags)
  );
}

function generateHybridSpecies(biome, filters, desiredCount = 3) {
  const pool = filteredPool(biome, filters);
  const basePool = pool.length ? pool : biome.species ?? [];
  if (!basePool.length) return [];

  const hybrids = [];
  const maxAttempts = Math.max(desiredCount * 6, 12);
  let attempts = 0;

  while (hybrids.length < desiredCount && attempts < maxAttempts) {
    attempts += 1;
    const primary = sample(basePool);
    if (!primary) break;
    const secondaryCandidates = basePool.filter((sp) => sp.id !== primary.id);
    const secondary = secondaryCandidates.length ? sample(secondaryCandidates) : null;

    const combinedFlags = mixFlags(primary.flags, secondary?.flags);
    const combinedTags = combineTags(primary.functional_tags, secondary?.functional_tags);
    const roleOptions = [primary.role_trofico, secondary?.role_trofico].filter(Boolean);
    const role = roleOptions.length ? sample(roleOptions) : primary.role_trofico ?? null;
    const displayName = combineNames(primary.display_name, secondary?.display_name);
    const baseId = slugify(displayName) || slugify(`${primary.id}-${secondary?.id ?? "solo"}`);
    const tier = inferThreatTierFromRole(role ?? "", combinedFlags);

    const hybrid = {
      id: `${baseId}-${Math.random().toString(36).slice(2, 6)}`,
      display_name: displayName,
      role_trofico: role,
      functional_tags: combinedTags,
      flags: combinedFlags,
      biomes: [biome.id],
      synthetic: true,
      syntheticTier: tier,
      balance: { threat_tier: `T${tier}` },
      sources: {
        primary: {
          id: primary.id,
          biome: primary.source_biome ?? primary.biomes?.[0] ?? null,
        },
        secondary: secondary
          ? {
              id: secondary.id,
              biome: secondary.source_biome ?? secondary.biomes?.[0] ?? null,
            }
          : null,
      },
    };

    if (
      matchesFlags(hybrid, filters.flags) &&
      matchesRoles(hybrid, filters.roles) &&
      matchesTags(hybrid, filters.tags)
    ) {
      hybrids.push(hybrid);
    }
  }

  if (!hybrids.length) {
    return basePool.slice(0, Math.min(desiredCount, basePool.length)).map((sp) => ({
      ...sp,
      id: `${slugify(sp.id || sp.display_name)}-${Math.random().toString(36).slice(2, 5)}`,
      display_name: `${sp.display_name ?? sp.id} Neo-Variant`,
      biomes: [biome.id],
      synthetic: true,
      syntheticTier: inferThreatTierFromRole(sp.role_trofico ?? "", sp.flags ?? {}),
      balance: { threat_tier: `T${inferThreatTierFromRole(sp.role_trofico ?? "", sp.flags ?? {})}` },
      sources: {
        primary: {
          id: sp.id,
          biome: sp.source_biome ?? sp.biomes?.[0] ?? null,
        },
        secondary: null,
      },
    }));
  }

  return hybrids;
}

const ROLE_MATCHERS = {
  apex: (sp) => sp.flags?.apex || tierOf(sp) >= 4,
  keystone: (sp) => sp.flags?.keystone,
  threat: (sp) =>
    sp.flags?.threat ||
    /predatore|incursore|menace|minaccia/i.test(sp.role_trofico ?? "") ||
    tierOf(sp) >= 3,
  bridge: (sp) =>
    sp.flags?.bridge || sp.flags?.event || /supporto|ponte|trasferimento/i.test(sp.role_trofico ?? ""),
};

function buildCandidatePools(biome, filters) {
  const generated = state.pick.species[biome.id] ?? [];
  const filtered = filteredPool(biome, filters);
  const nativePool = biome.species ?? [];
  const preferGenerated = biome.synthetic && generated.length > 0;

  const prioritized = preferGenerated
    ? uniqueById([...generated, ...filtered])
    : uniqueById([...filtered]);
  const fallback = uniqueById([...filtered, ...nativePool]);
  const full = preferGenerated
    ? uniqueById([...generated, ...filtered, ...nativePool])
    : uniqueById([...filtered, ...nativePool]);

  const sorted = [...full].sort((a, b) => tierOf(b) - tierOf(a));

  return {
    preferGenerated,
    prioritized,
    fallback,
    full,
    sorted,
  };
}

function selectFromPools(pools, used, predicate) {
  if (!predicate) return null;
  const sequences = [];
  if (pools.prioritized.length) {
    sequences.push(pools.prioritized);
  }
  if (pools.fallback.length) {
    sequences.push(pools.fallback);
  }
  sequences.push(pools.full);

  for (const seq of sequences) {
    const candidate = seq.find((sp) => !used.has(sp.id) && predicate(sp));
    if (candidate) {
      return candidate;
    }
  }
  return null;
}

function normalisePartyEntry(sp) {
  return {
    id: sp.id,
    display_name: sp.display_name ?? sp.id,
    role: sp.role_trofico ?? null,
    tier: tierOf(sp),
    count: 1,
    sources: sp.sources ?? null,
    synthetic: Boolean(sp.synthetic),
  };
}

function ensureMinimumIndividuals(party, blueprint, fallback) {
  if (!party.length && fallback) {
    party.push(normalisePartyEntry(fallback));
  }

  if (!party.length) {
    return;
  }

  const target = Math.max(blueprint.minSize ?? 1, 1);
  let individuals = party.reduce((sum, entry) => sum + (entry.count ?? 1), 0);
  while (individuals < target) {
    const last = party[party.length - 1];
    last.count = (last.count ?? 1) + 1;
    individuals = party.reduce((sum, entry) => sum + (entry.count ?? 1), 0);
  }
}

function describeSeedNotes(biome, blueprint, filters, preferGenerated) {
  const filterSummary = summariseFilters(filters);
  if (biome.synthetic) {
    const sources = (biome.parents ?? [])
      .map((parent) => parent.label ?? titleCase(parent.id ?? ""))
      .filter(Boolean)
      .join(" + ") || "fonti miste";
    const origin = preferGenerated ? "specie ibride" : "catalogo originale";
    return `${blueprint.label} sintetico (${filterSummary}). Origine: ${sources}. Sorgente: ${origin}.`;
  }
  return `${blueprint.label} dal catalogo (${filterSummary}).`;
}

function createSeedFromBlueprint(biome, filters, blueprint) {
  const pools = buildCandidatePools(biome, filters);
  const used = new Set();
  const party = [];

  const addToParty = (sp) => {
    if (!sp || used.has(sp.id)) return;
    used.add(sp.id);
    party.push(normalisePartyEntry(sp));
  };

  blueprint.priorities.forEach((key) => {
    const matcher = ROLE_MATCHERS[key];
    const candidate = matcher ? selectFromPools(pools, used, matcher) : null;
    if (candidate) {
      addToParty(candidate);
    }
  });

  for (const sp of pools.sorted) {
    if (party.length >= (blueprint.targetSize ?? party.length + 1)) {
      break;
    }
    if (used.has(sp.id)) continue;
    addToParty(sp);
  }

  ensureMinimumIndividuals(party, blueprint, pools.sorted[0] ?? null);

  if (!party.length) {
    return null;
  }

  const budget = party.reduce((sum, entry) => sum + entry.tier * (entry.count ?? 1), 0);

  return {
    encounter_id: `auto_${blueprint.id}_${biome.id}_${Math.random().toString(36).slice(2, 8)}`,
    biome_id: biome.id,
    template: blueprint.id,
    label: blueprint.label,
    description: blueprint.summary,
    party,
    threat_budget: budget,
    synthetic: biome.synthetic || undefined,
    notes: describeSeedNotes(biome, blueprint, filters, pools.preferGenerated),
  };
}

function rerollSpecies(filters) {
  state.pick.species = {};
  state.pick.biomes.forEach((biome) => {
    if (biome.synthetic) {
      const hybrids = generateHybridSpecies(biome, filters, 3);
      state.pick.species[biome.id] = hybrids;
      biome.generatedSpecies = hybrids;
      return;
    }

    const pool = filteredPool(biome, filters);
    const nativePool = biome.species ?? [];
    const working = pool.length ? pool : nativePool;
    const picks = shuffle(working).slice(0, Math.min(3, working.length));
    state.pick.species[biome.id] = picks;
    if (biome.generatedSpecies) {
      delete biome.generatedSpecies;
    }
  });
}

function rerollSeeds(filters) {
  state.pick.seeds = [];
  state.pick.biomes.forEach((biome) => {
    ENCOUNTER_BLUEPRINTS.forEach((blueprint) => {
      const seed = createSeedFromBlueprint(biome, filters, blueprint);
      if (seed) {
        state.pick.seeds.push(seed);
      }
    });
  });
}

function renderBiomes(filters) {
  updateSummaryCounts();
  const grid = elements.biomeGrid;
  if (!grid) return;
  grid.innerHTML = "";
  
  if (!state.pick.biomes.length) {
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "Nessun bioma selezionato. Genera un ecosistema per iniziare.";
    grid.appendChild(placeholder);
    return;
  }

  state.pick.biomes.forEach((biome) => {
    const card = document.createElement("article");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = biome.synthetic ? biome.label ?? biome.id : biome.id;

    const meta = document.createElement("p");
    meta.className = "form__hint";
    if (biome.synthetic) {
      const parentLinks = (biome.parents ?? []).map((parent) => {
        const href = parent.path ? resolvePackHref(parent.path) : null;
        if (href) {
          return `<a href="${href}" target="_blank" rel="noreferrer">${parent.label}</a>`;
        }
        return parent.label;
      });
      const parentSummary = parentLinks.length ? parentLinks.join(" + ") : "—";
      meta.innerHTML = `Origine: ${parentSummary} · <span>Sintetico</span>`;
    } else {
      const biomeHref = resolvePackHref(biome.path);
      const foodwebHref = biome.foodweb?.path ? resolvePackHref(biome.foodweb.path) : null;
      const reportHref = new URL(
        `catalog.html#bioma-${biome.id}`,
        window.location.href
      ).toString();
      const metaParts = [];
      if (biomeHref) {
        metaParts.push(
          `<a href="${biomeHref}" target="_blank" rel="noreferrer">Bioma YAML</a>`
        );
      }
      if (foodwebHref) {
        metaParts.push(
          `<a href="${foodwebHref}" target="_blank" rel="noreferrer">Foodweb</a>`
        );
      }
      if (reportHref) {
        metaParts.push(`<a href="${reportHref}">Report</a>`);
      }
      meta.innerHTML = metaParts.join(" · ") || "Bioma del catalogo";
    }

    const list = document.createElement("ul");
    const picked = state.pick.species[biome.id] ?? [];
    if (!picked.length) {
      const empty = document.createElement("li");
      empty.className = "placeholder";
      const filtersText = [];
      if (filters.flags.length) filtersText.push(`flag: ${filters.flags.join(", ")}`);
      if (filters.roles.length) filtersText.push(`ruoli: ${filters.roles.join(", ")}`);
      if (filters.tags.length) filtersText.push(`tag: ${filters.tags.join(", ")}`);
      empty.textContent = filtersText.length
        ? `Nessuna specie soddisfa i filtri (${filtersText.join(" · ")}).`
        : "Nessuna specie estratta, riprova con un re-roll.";
      list.appendChild(empty);
    } else {
      picked.forEach((sp) => {
        const item = document.createElement("li");
        const details = [sp.role_trofico ?? "—"];
        if (sp.synthetic) {
          details.push("Synth");
        }
        const tier = tierOf(sp);
        details.push(`T${tier}`);
        const detailSummary = details.join(" · ");
        item.innerHTML = `<strong>${sp.display_name}</strong> <span class="form__hint">(${sp.id}) — ${detailSummary}</span>`;
        list.appendChild(item);
      });
    }

    const traitInfo = gatherTraitInfoForBiome(biome);
    const traitBlock = traitInfo
      ? buildTraitBlock(traitInfo, { synthetic: Boolean(biome.synthetic) })
      : null;

    card.append(title, meta, list);
    if (traitBlock) {
      card.appendChild(traitBlock);
    }
    grid.appendChild(card);
  });

}

function renderSeeds() {
  updateSummaryCounts();
  const container = elements.seedGrid;
  if (!container) return;
  container.innerHTML = "";

  if (!state.pick.seeds.length) {
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "Genera un ecosistema per ottenere encounter seed.";
    container.appendChild(placeholder);
    return;
  }

  state.pick.seeds.forEach((seed) => {
    const card = document.createElement("article");
    card.className = "card";

    const header = document.createElement("h3");
    const headingParts = [seed.biome_id];
    if (seed.label) {
      headingParts.push(seed.label);
    }
    if (seed.synthetic) {
      headingParts.push("Synth");
    }
    header.innerHTML = `${headingParts.join(" · ")} · <span class="form__hint">Budget T${seed.threat_budget}</span>`;

    if (seed.description || seed.notes) {
      const meta = document.createElement("p");
      meta.className = "form__hint";
      const metaParts = [];
      if (seed.description) metaParts.push(seed.description);
      if (seed.notes) metaParts.push(seed.notes);
      meta.textContent = metaParts.join(" · ");
      card.append(header, meta);
    } else {
      card.append(header);
    }

    const list = document.createElement("ul");
    if (!seed.party.length) {
      const empty = document.createElement("li");
      empty.className = "placeholder";
      empty.textContent = "Nessuna specie disponibile per questo seed con i filtri selezionati.";
      list.appendChild(empty);
    } else {
      seed.party.forEach((entry) => {
        const item = document.createElement("li");
        const parts = [entry.id, entry.role ?? "—", `T${entry.tier}`];
        if (entry.count && entry.count > 1) {
          parts.push(`x${entry.count}`);
        }
        if (entry.sources || entry.synthetic) {
          parts.push("Synth");
        }
        item.innerHTML = `${entry.display_name} <span class="form__hint">(${parts.join(" · ")})</span>`;
        list.appendChild(item);
      });
    }

    card.append(list);
    container.appendChild(card);
  });

}

function exportPayload(filters) {
  const catalogSource =
    resolvedCatalogUrl || packContext?.catalogUrl || resolvedPackRoot || packContext?.resolvedBase || null;
  return {
    pick: state.pick,
    filters,
    source: {
      catalog: catalogSource,
      generated_at: new Date().toISOString(),
    },
  };
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toYAML(value, indent = 0) {
  const space = "  ".repeat(indent);
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    return value
      .map((item) => `${space}- ${toYAML(item, indent + 1).replace(/^\s*/, "")}`)
      .join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) return "{}";
    return entries
      .map(([key, val]) => {
        const formatted = toYAML(val, indent + 1);
        const needsBlock = typeof val === "object" && val !== null;
        return `${space}${key}: ${needsBlock ? `\n${formatted}` : formatted}`;
      })
      .join("\n");
  }
  if (typeof value === "string") {
    if (/[:#\-\[\]\{\}\n]/.test(value)) {
      return JSON.stringify(value);
    }
    return value;
  }
  return String(value);
}

async function tryFetchJson(url) {
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

function localTraitFallbackUrl() {
  try {
    return new URL("./env-traits.json", import.meta.url).toString();
  } catch (error) {
    console.warn("Impossibile calcolare il percorso locale dei tratti", error);
    return null;
  }
}

async function loadTraitRegistry(context) {
  const tried = new Set();
  const candidates = [];
  if (context?.resolveDocHref) {
    try {
      candidates.push(context.resolveDocHref("env_traits.json"));
    } catch (error) {
      console.warn("Impossibile risolvere env_traits.json tramite docsBase", error);
    }
  }
  if (context?.resolvePackHref) {
    try {
      candidates.push(context.resolvePackHref("docs/catalog/env_traits.json"));
    } catch (error) {
      console.warn("Impossibile risolvere env_traits.json tramite packBase", error);
    }
  }
  candidates.push(localTraitFallbackUrl());

  for (const candidate of candidates) {
    if (!candidate || tried.has(candidate)) continue;
    tried.add(candidate);
    try {
      const registry = await tryFetchJson(candidate);
      if (registry) {
        setTraitRegistry(registry);
        return;
      }
    } catch (error) {
      console.warn("Caricamento registry tratti fallito", candidate, error);
    }
  }

  console.warn("Nessuna sorgente valida per il registry tratti trovata.");
  setTraitRegistry({ schema_version: "0", rules: [] });
}

function localTraitReferenceFallbackUrl() {
  try {
    return new URL("./trait-reference.json", import.meta.url).toString();
  } catch (error) {
    console.warn("Impossibile calcolare il percorso locale del reference tratti", error);
    return null;
  }
}

async function loadTraitReference(context) {
  const tried = new Set();
  const candidates = [];
  if (context?.resolveDocHref) {
    try {
      candidates.push(context.resolveDocHref("trait_reference.json"));
    } catch (error) {
      console.warn("Impossibile risolvere trait_reference.json tramite docsBase", error);
    }
    try {
      candidates.push(context.resolveDocHref("trait-reference.json"));
    } catch (error) {
      console.warn("Impossibile risolvere trait-reference.json tramite docsBase", error);
    }
  }
  if (context?.resolvePackHref) {
    try {
      candidates.push(context.resolvePackHref("docs/catalog/trait_reference.json"));
    } catch (error) {
      console.warn("Impossibile risolvere trait_reference.json tramite packBase", error);
    }
    try {
      candidates.push(context.resolvePackHref("docs/catalog/trait-reference.json"));
    } catch (error) {
      console.warn("Impossibile risolvere trait-reference.json tramite packBase", error);
    }
  }
  candidates.push(localTraitReferenceFallbackUrl());

  for (const candidate of candidates) {
    if (!candidate || tried.has(candidate)) continue;
    tried.add(candidate);
    try {
      const catalog = await tryFetchJson(candidate);
      if (catalog) {
        setTraitReference(catalog);
        return;
      }
    } catch (error) {
      console.warn("Caricamento reference tratti fallito", candidate, error);
    }
  }

  console.warn("Nessuna sorgente valida per il reference tratti trovata.");
  setTraitReference({ schema_version: "0", traits: {} });
}

function localHazardFallbackUrl() {
  try {
    return new URL("./hazards.json", import.meta.url).toString();
  } catch (error) {
    console.warn("Impossibile calcolare il percorso locale degli hazard", error);
    return null;
  }
}

async function loadHazardRegistry(context) {
  const tried = new Set();
  const candidates = [];
  if (context?.resolveDocHref) {
    try {
      candidates.push(context.resolveDocHref("hazards.json"));
    } catch (error) {
      console.warn("Impossibile risolvere hazards.json tramite docsBase", error);
    }
  }
  if (context?.resolvePackHref) {
    try {
      candidates.push(context.resolvePackHref("docs/catalog/hazards.json"));
    } catch (error) {
      console.warn("Impossibile risolvere hazards.json tramite packBase", error);
    }
  }
  candidates.push(localHazardFallbackUrl());

  for (const candidate of candidates) {
    if (!candidate || tried.has(candidate)) continue;
    tried.add(candidate);
    try {
      const registry = await tryFetchJson(candidate);
      if (registry) {
        setHazardRegistry(registry);
        return;
      }
    } catch (error) {
      console.warn("Caricamento registry hazard fallito", candidate, error);
    }
  }

  console.warn("Nessuna sorgente valida per il registry hazard trovata.");
  setHazardRegistry({ schema_version: "0", hazards: {} });
}

function attachActions() {
  if (!elements.form) return;
  elements.form.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    if (!action) return;
    event.preventDefault();
    if (!state.data) {
      setStatus("Caricare i dati prima di utilizzare il generatore.", "error");
      return;
    }
    const filters = currentFilters();
    switch (action) {
      case "roll-ecos": {
        const n = Math.max(1, Math.min(parseInt(elements.nBiomi.value, 10) || 2, 6));
        const pool = generateSyntheticBiomes(state.data.biomi, n);
        state.pick.ecosystem = {
          id: randomId("ecos"),
          label: `Rete sintetica (${pool.length} biomi)`,
          synthetic: true,
          sources: state.data.ecosistema?.biomi?.map((b) => b.id) ?? [],
          connessioni: synthesiseConnections(pool),
        };
        state.pick.biomes = pool;
        state.pick.exportSlug = null;
        rerollSpecies(filters);
        rerollSeeds(filters);
        renderBiomes(filters);
        renderSeeds();
        setStatus(
          `Generati ${state.pick.biomes.length} biomi sintetici e ${state.pick.seeds.length} seed.`
        );
        break;
      }
      case "reroll-biomi": {
        if (!state.pick.biomes.length) {
          setStatus("Genera prima un ecosistema completo.", "warn");
          return;
        }
        const n = Math.max(1, Math.min(parseInt(elements.nBiomi.value, 10) || state.pick.biomes.length, 6));
        const pool = generateSyntheticBiomes(state.data.biomi, n);
        state.pick.biomes = pool;
        state.pick.ecosystem = {
          id: state.pick.ecosystem?.id || randomId("ecos"),
          label: `Rete sintetica (${pool.length} biomi)`,
          synthetic: true,
          sources: state.data.ecosistema?.biomi?.map((b) => b.id) ?? [],
          connessioni: synthesiseConnections(pool),
        };
        state.pick.exportSlug = null;
        rerollSpecies(filters);
        rerollSeeds(filters);
        renderBiomes(filters);
        renderSeeds();
        setStatus("Biomi sintetici ricalcolati con i filtri correnti.");
        break;
      }
      case "reroll-species": {
        if (!state.pick.biomes.length) {
          setStatus("Genera prima un ecosistema per estrarre le specie.", "warn");
          return;
        }
        rerollSpecies(filters);
        renderBiomes(filters);
        setStatus("Specie ricalcolate.");
        break;
      }
      case "reroll-seeds": {
        if (!state.pick.biomes.length) {
          setStatus("Genera prima un ecosistema per creare gli encounter seed.", "warn");
          return;
        }
        rerollSeeds(filters);
        renderSeeds();
        setStatus("Seed rigenerati.");
        break;
      }
      case "export-json": {
        const payload = exportPayload(filters);
        const slug = ensureExportSlug();
        downloadFile(`${slug}.json`, JSON.stringify(payload, null, 2), "application/json");
        setStatus("Esportazione JSON completata.");
        break;
      }
      case "export-yaml": {
        const payload = exportPayload(filters);
        const yaml = toYAML(payload);
        const slug = ensureExportSlug();
        downloadFile(`${slug}.yaml`, yaml, "text/yaml");
        setStatus("Esportazione YAML completata.");
        break;
      }
      default:
        break;
    }
  });
}

async function loadData() {
  setStatus("Caricamento catalogo in corso…");
  try {
    const { data, context } = await loadPackCatalog();
    applyCatalogContext(data, context);
    await loadTraitRegistry(context);
    await loadTraitReference(context);
    await loadHazardRegistry(context);
    setStatus("Catalogo pronto all'uso. Genera un ecosistema!");
    return;
  } catch (error) {
    console.warn("Caricamento catalogo tramite loader condiviso fallito", error);
  }

  try {
    const { data, context } = await manualLoadCatalog();
    applyCatalogContext(data, context);
    await loadTraitRegistry(context);
    await loadTraitReference(context);
    await loadHazardRegistry(context);
    setStatus("Catalogo pronto all'uso dal fallback manuale. Genera un ecosistema!");
  } catch (error) {
    console.error("Impossibile caricare il catalogo da alcuna sorgente", error);
    await loadTraitRegistry(packContext);
    await loadTraitReference(packContext);
    await loadHazardRegistry(packContext);
    setStatus("Errore durante il caricamento del catalogo. Controlla la console.", "error");
  }
}

updateSummaryCounts();
restoreActivityLog();
renderActivityLog();
renderTraitExpansions();
attachActions();
loadData();

if (typeof window !== "undefined") {
  window.EvoPack = window.EvoPack || {};
  window.EvoPack.packRootCandidates = PACK_ROOT_CANDIDATES;
  window.EvoPack.generator = {
    get state() {
      return state;
    },
    get traitReference() {
      return state.traitReference;
    },
    getTraitDetails,
    getResolvedCatalogUrl() {
      return resolvedCatalogUrl;
    },
    getResolvedPackRoot() {
      return resolvedPackRoot;
    },
    getPackDocsBase() {
      return packDocsBase;
    },
    getContext() {
      return packContext;
    },
    manualLoadCatalog,
    loadPackCatalog,
  };
}
