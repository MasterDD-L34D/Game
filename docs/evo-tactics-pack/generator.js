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
  comparePanel: document.getElementById("generator-compare-panel"),
  compareList: document.getElementById("generator-compare-list"),
  compareEmpty: document.getElementById("generator-compare-empty"),
  compareChartContainer: document.getElementById("generator-compare-chart"),
  compareCanvas: document.getElementById("generator-compare-canvas"),
  compareFallback: document.getElementById("generator-compare-fallback"),
  pinnedList: document.getElementById("generator-pinned-list"),
  pinnedEmpty: document.getElementById("generator-pinned-empty"),
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

const anchorUi = {
  root: document.querySelector("[data-anchor-root]"),
  anchors: Array.from(document.querySelectorAll("[data-anchor-target]")),
  panels: Array.from(document.querySelectorAll("[data-panel]")),
  breadcrumbTargets: Array.from(document.querySelectorAll("[data-anchor-breadcrumb]")),
  minimapContainers: Array.from(document.querySelectorAll("[data-anchor-minimap]")),
  overlay: document.querySelector("[data-codex-overlay]"),
  codexToggles: Array.from(document.querySelectorAll("[data-codex-toggle]")),
  codexClosers: Array.from(document.querySelectorAll("[data-codex-close]")),
};

const anchorState = {
  descriptors: [],
  descriptorsById: new Map(),
  sectionsById: new Map(),
  minimaps: new Map(),
  observer: null,
  scrollHandler: null,
  activeId: null,
  lastToggle: null,
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
  cardState: {
    pinned: new Map(),
    squad: new Map(),
    comparison: new Map(),
  },
};

let packContext = null;
let resolvedCatalogUrl = null;
let resolvedPackRoot = null;
let packDocsBase = null;
let cachedStorage = null;
let storageChecked = false;
let comparisonChart = null;
let chartUnavailableNotified = false;

const COMPARISON_LABELS = ["Tier medio", "Densità hazard", "Diversità ruoli"];

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
  renderPinnedSummary();
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

function getPanelIdFromHash() {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash ?? "";
  if (!hash) return null;
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  const target = document.getElementById(id);
  if (!target) return null;
  return target.dataset?.panel ?? null;
}

function scrollToPanel(panelId, { smooth = true } = {}) {
  if (!panelId) return;
  const entry = anchorState.sectionsById.get(panelId);
  const panel = entry?.element;
  if (!panel) return;
  if (!panel.hasAttribute("tabindex")) {
    panel.setAttribute("tabindex", "-1");
  }
  const behavior = smooth ? "smooth" : "auto";
  panel.scrollIntoView({ behavior, block: "start" });
  window.requestAnimationFrame(() => {
    try {
      panel.focus({ preventScroll: true });
    } catch (error) {
      panel.focus();
    }
  });
}

function updateBreadcrumbs(sectionId) {
  const descriptor = anchorState.descriptorsById.get(sectionId);
  const label = descriptor?.label ?? "";
  anchorUi.breadcrumbTargets.forEach((target) => {
    if (target) {
      target.textContent = label;
      target.dataset.activeAnchor = sectionId ?? "";
    }
  });
}

function updateMinimapState() {
  anchorState.minimaps.forEach((map) => {
    map.forEach(({ item, progress }, id) => {
      const descriptor = anchorState.descriptorsById.get(id);
      if (!descriptor) return;
      const ratio = Math.max(0, Math.min(1, descriptor.progress ?? 0));
      progress.style.setProperty("--progress", `${Math.round(ratio * 100)}%`);
      if (anchorState.activeId === id) {
        item.classList.add("is-active");
      } else {
        item.classList.remove("is-active");
      }
    });
  });
}

function setActiveSection(sectionId, { updateHash = false, silent = false } = {}) {
  if (!sectionId || !anchorState.descriptorsById.has(sectionId)) {
    return;
  }

  const previous = anchorState.activeId;
  anchorState.activeId = sectionId;

  if (previous !== sectionId || !silent) {
    anchorState.descriptors.forEach((descriptor) => {
      if (descriptor.id === sectionId) {
        descriptor.anchor.classList.add("is-active");
        descriptor.anchor.setAttribute("aria-current", "location");
      } else {
        descriptor.anchor.classList.remove("is-active");
        descriptor.anchor.removeAttribute("aria-current");
      }
    });
    updateBreadcrumbs(sectionId);
    updateMinimapState();
  }

  if (updateHash) {
    const panel = anchorState.sectionsById.get(sectionId)?.element;
    if (panel?.id && typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState(null, "", `#${panel.id}`);
    }
  }
}

function computeActiveSection() {
  if (!anchorState.descriptors.length) return null;
  const visible = anchorState.descriptors.filter((descriptor) => descriptor.isIntersecting);
  if (visible.length) {
    visible.sort((a, b) => (a.top ?? 0) - (b.top ?? 0));
    return visible[0].id;
  }

  let candidate = null;
  let minTop = Infinity;
  anchorState.descriptors.forEach((descriptor) => {
    const section = anchorState.sectionsById.get(descriptor.id);
    const element = section?.element;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (rect.top >= 0 && rect.top < minTop) {
      minTop = rect.top;
      candidate = descriptor.id;
    }
  });

  if (candidate) return candidate;
  return anchorState.descriptors[anchorState.descriptors.length - 1]?.id ?? null;
}

function handleAnchorObserver(entries) {
  entries.forEach((entry) => {
    const id = entry.target.dataset.panel;
    if (!id) return;
    const descriptor = anchorState.descriptorsById.get(id);
    if (!descriptor) return;
    descriptor.progress = entry.intersectionRatio ?? 0;
    descriptor.isIntersecting = entry.isIntersecting;
    descriptor.top = entry.boundingClientRect?.top ?? 0;
    descriptor.bottom = entry.boundingClientRect?.bottom ?? 0;
  });

  const nextActive = computeActiveSection();
  if (nextActive) {
    setActiveSection(nextActive, { silent: true });
  }
  updateMinimapState();
}

function cleanupScrollFallback() {
  if (!anchorState.scrollHandler || typeof window === "undefined") {
    return;
  }
  window.removeEventListener("scroll", anchorState.scrollHandler);
  window.removeEventListener("resize", anchorState.scrollHandler);
  anchorState.scrollHandler = null;
}

function createAnchorObserver() {
  if (anchorState.observer) {
    anchorState.observer.disconnect();
  }
  cleanupScrollFallback();
  if (!anchorUi.panels.length) return;

  if (typeof IntersectionObserver === "undefined") {
    if (typeof window === "undefined") {
      return;
    }
    anchorState.scrollHandler = () => {
      const viewportHeight =
        window.innerHeight || document.documentElement?.clientHeight || 1;

      anchorState.descriptors.forEach((descriptor) => {
        const section = anchorState.sectionsById.get(descriptor.id);
        const element = section?.element;
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const height = rect.height || element.offsetHeight || 1;
        const visible = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
        const ratio = Math.max(0, Math.min(1, visible / height));

        descriptor.progress = Number.isFinite(ratio) ? ratio : 0;
        descriptor.isIntersecting = rect.top < viewportHeight && rect.bottom > 0;
        descriptor.top = rect.top;
        descriptor.bottom = rect.bottom;
      });

      const nextActive = computeActiveSection();
      if (nextActive) {
        setActiveSection(nextActive, { silent: true });
      }
      updateMinimapState();
    };

    window.addEventListener("scroll", anchorState.scrollHandler, { passive: true });
    window.addEventListener("resize", anchorState.scrollHandler);
    anchorState.scrollHandler();
    return;
  }

  const thresholds = [];
  for (let value = 0; value <= 1; value += 0.25) {
    thresholds.push(Number(value.toFixed(2)));
  }

  anchorState.observer = new IntersectionObserver(handleAnchorObserver, {
    rootMargin: "-40% 0px -40% 0px",
    threshold: thresholds,
  });

  anchorState.sectionsById.forEach(({ element }) => {
    if (element) {
      anchorState.observer.observe(element);
    }
  });
}

function setupMinimaps() {
  anchorState.minimaps = new Map();

  anchorUi.minimapContainers.forEach((container) => {
    if (!container) return;
    const isOverlay = container.dataset.minimapMode === "overlay";
    const existingTitle = container.querySelector(".codex-minimap__title");
    const label = container.dataset.minimapLabel || existingTitle?.textContent?.trim() || "Minimappa";

    container.innerHTML = "";

    if (!isOverlay) {
      const title = document.createElement("p");
      title.className = "codex-minimap__title";
      title.textContent = label;
      container.appendChild(title);
    }

    const list = document.createElement("ol");
    list.className = isOverlay ? "codex-overlay__list" : "codex-minimap__list";
    const registry = new Map();

    anchorState.descriptors.forEach((descriptor) => {
      const item = document.createElement("li");
      item.className = isOverlay ? "codex-overlay__item" : "codex-minimap__item";
      item.dataset.minimapItem = descriptor.id;

      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = isOverlay ? "codex-overlay__link" : "codex-minimap__link";
      trigger.textContent = descriptor.label;
      trigger.addEventListener("click", () => {
        setActiveSection(descriptor.id, { updateHash: true });
        scrollToPanel(descriptor.id);
        if (isOverlay) {
          closeCodex();
        }
      });

      const progress = document.createElement("span");
      progress.className = isOverlay ? "codex-overlay__progress" : "codex-minimap__progress";
      progress.style.setProperty("--progress", "0%");

      item.append(trigger, progress);
      list.appendChild(item);
      registry.set(descriptor.id, { item, progress });
    });

    container.appendChild(list);
    anchorState.minimaps.set(container, registry);
  });

  updateMinimapState();
}

function closeCodex() {
  if (!anchorUi.overlay || anchorUi.overlay.hidden) {
    return;
  }
  anchorUi.overlay.hidden = true;
  anchorUi.overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("codex-open");
  if (anchorState.lastToggle && typeof anchorState.lastToggle.focus === "function") {
    anchorState.lastToggle.focus();
  }
  anchorState.lastToggle = null;
}

function setupAnchorNavigation() {
  if (!anchorUi.anchors.length || !anchorUi.panels.length) {
    return;
  }

  anchorState.sectionsById = new Map();
  anchorUi.panels.forEach((panel) => {
    const panelId = panel.dataset.panel;
    if (!panelId) return;
    anchorState.sectionsById.set(panelId, { element: panel });
    if (!panel.hasAttribute("tabindex")) {
      panel.setAttribute("tabindex", "-1");
    }
  });

  anchorState.descriptors = anchorUi.anchors
    .map((anchor) => {
      const id = anchor.dataset.anchorTarget;
      if (!id || !anchorState.sectionsById.has(id)) return null;
      const label = anchor.textContent?.trim() || id;
      return { id, label, anchor, progress: 0, isIntersecting: false, top: 0, bottom: 0 };
    })
    .filter(Boolean);

  anchorState.descriptorsById = new Map(
    anchorState.descriptors.map((descriptor) => [descriptor.id, descriptor])
  );

  if (!anchorState.descriptors.length) {
    return;
  }

  anchorState.descriptors.forEach((descriptor) => {
    descriptor.anchor.addEventListener("click", (event) => {
      event.preventDefault();
      setActiveSection(descriptor.id, { updateHash: true });
      scrollToPanel(descriptor.id);
      closeCodex();
    });
  });

  setupMinimaps();
  createAnchorObserver();

  const initialId = getPanelIdFromHash();
  if (initialId && anchorState.descriptorsById.has(initialId)) {
    setActiveSection(initialId, { silent: true });
  } else {
    setActiveSection(anchorState.descriptors[0].id, { silent: true });
  }

  window.addEventListener("hashchange", () => {
    const fromHash = getPanelIdFromHash();
    if (fromHash && anchorState.descriptorsById.has(fromHash)) {
      setActiveSection(fromHash, { silent: true });
    }
  });
}

function openCodex() {
  if (!anchorUi.overlay) return;
  if (!anchorState.minimaps.size) {
    setupMinimaps();
  }
  anchorUi.overlay.hidden = false;
  anchorUi.overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("codex-open");
  updateMinimapState();
  const closeButton = anchorUi.overlay.querySelector("[data-codex-close]");
  if (closeButton) {
    closeButton.focus({ preventScroll: true });
  }
}

function setupCodexControls() {
  if (!anchorUi.overlay) return;

  anchorUi.codexToggles.forEach((button) => {
    if (!button) return;
    button.addEventListener("click", () => {
      anchorState.lastToggle = button;
      openCodex();
    });
  });

  anchorUi.codexClosers.forEach((button) => {
    if (!button) return;
    button.addEventListener("click", () => {
      closeCodex();
    });
  });

  anchorUi.overlay.addEventListener("click", (event) => {
    if (event.target === anchorUi.overlay) {
      closeCodex();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("codex-open")) {
      closeCodex();
    }
  });
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


function createPinKey(biome, species) {
  const biomeId = biome?.id ?? "biome";
  const speciesId = species?.id ?? "species";
  return `${biomeId}::${speciesId}`;
}

function queryPinButton(key) {
  if (typeof document === "undefined") return null;
  const safeKey =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(key)
      : key.replace(/"/g, '\"');
  return document.querySelector(`button[data-pin-key="${safeKey}"]`);
}

function queryCompareButton(key) {
  if (typeof document === "undefined") return null;
  const safeKey =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(key)
      : key.replace(/"/g, '\"');
  return document.querySelector(`button[data-compare-key="${safeKey}"]`);
}

function applyQuickButtonState(button, isActive) {
  if (!button) return;
  button.classList.toggle("is-active", Boolean(isActive));
  button.setAttribute("aria-pressed", isActive ? "true" : "false");
}

function updatePinButtonState(key, active) {
  const button = queryPinButton(key);
  if (!button) return;
  applyQuickButtonState(button, active);
  const card = button.closest(".species-card");
  if (card) {
    card.dataset.pinned = active ? "true" : "false";
  }
}

function updateCompareButtonState(key, active) {
  const button = queryCompareButton(key);
  if (!button) return;
  applyQuickButtonState(button, active);
  const card = button.closest(".species-card");
  if (card) {
    card.dataset.compare = active ? "true" : "false";
  }
}

function stringHash(value = "") {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
    hash &= hash;
  }
  return Math.abs(hash);
}

function gradientFromString(value = "") {
  const hash = stringHash(value);
  const hue = hash % 360;
  const hueOffset = (hue + 36) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 68%, 26%), hsl(${hueOffset}, 70%, 38%))`;
}

function colorPairFromString(value = "") {
  const hash = stringHash(value);
  const hue = hash % 360;
  const saturation = 70;
  const lightness = 58;
  return {
    border: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    fill: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.2)`,
  };
}

function clampScale(value, max = 5) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  return Math.min(value, max);
}

function biomePlaceholderLabel(biome) {
  if (biome?.emoji) return biome.emoji;
  if (biome?.icon) return biome.icon;
  const id = (biome?.id ?? "").toLowerCase();
  if (/ghiaccio|cryosteppe|neve|tundra/.test(id)) return "❄️";
  if (/foresta|bosco|giungla/.test(id)) return "🌲";
  if (/deserto|sabbia|duna/.test(id)) return "🏜️";
  if (/palude|swamp|marsh|laguna/.test(id)) return "🦎";
  if (/mont|rupe|alp/.test(id)) return "⛰️";
  if (/costa|reef|mare|oceano|litor/.test(id)) return "🌊";
  if (/vulc|lava|fuoco/.test(id)) return "🌋";
  const initials = (biome?.label ?? biome?.id ?? "??")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "🜨";
}

function speciesPlaceholderIcon(species) {
  if (species?.emoji) return species.emoji;
  if (species?.icon) return species.icon;
  const role = (species?.role_trofico ?? "").toLowerCase();
  if (/predatore_terziario|apex/.test(role)) return "🦈";
  if (/predatore/.test(role)) return "🦖";
  if (/erbivoro|prede|pastoral/.test(role)) return "🦌";
  if (/impollin/.test(role)) return "🪲";
  if (/detrit|saprof/.test(role)) return "🪱";
  if (/evento|anomalia|hazard/.test(role)) return "⚡";
  return "🧬";
}

function createBadgeElement(label, modifier) {
  const badge = document.createElement("span");
  badge.className = "badge";
  if (modifier) {
    badge.classList.add(`badge--${modifier}`);
  }
  badge.textContent = label;
  return badge;
}

function rarityFromTier(tier) {
  if (tier <= 1) return { label: "Comune", slug: "common" };
  if (tier === 2) return { label: "Non comune", slug: "uncommon" };
  if (tier === 3) return { label: "Raro", slug: "rare" };
  if (tier === 4) return { label: "Epico", slug: "epic" };
  return { label: "Leggendario", slug: "legendary" };
}

function extractFunctionalGroups(biome) {
  const groups = new Set();
  const manifestGroups = biome?.manifest?.functional_groups_present ?? [];
  manifestGroups.forEach((group) => {
    if (group) groups.add(group);
  });
  const functional = biome?.functional_groups ?? biome?.functionalGroups ?? [];
  functional.forEach((group) => {
    if (group) groups.add(group);
  });
  const tags = biome?.functional_tags ?? [];
  tags.forEach((tag) => {
    if (tag) groups.add(tag);
  });
  return groups;
}

function calculateSynergy(species, biome) {
  const groups = extractFunctionalGroups(biome);
  const tags = Array.isArray(species?.functional_tags) ? species.functional_tags : [];
  const matches = tags.filter((tag) => groups.has(tag));
  let percent;
  if (groups.size && tags.length) {
    percent = Math.round((matches.length / groups.size) * 100);
  } else if (tags.length) {
    percent = 55;
  } else {
    percent = 30;
  }
  const flags = species?.flags ?? {};
  if (flags.keystone) percent += 12;
  if (flags.apex) percent += 14;
  if (flags.threat) percent += 8;
  if (flags.bridge) percent += 6;
  if (flags.event) percent -= 4;
  if (species?.synthetic) percent += 4;
  percent += Math.max(0, tierOf(species) - 2) * 4;
  percent = Math.max(10, Math.min(100, percent));
  const summary = matches.length
    ? `Sinergie attive: ${matches.join(", ")}`
    : tags.length
    ? `Tag funzionali da connettere: ${tags.join(", ")}`
    : "Nessun tag funzionale dichiarato.";
  return {
    percent,
    matches,
    tags,
    groups: Array.from(groups),
    summary,
  };
}

function createSynergyMeter(info) {
  const meter = document.createElement("div");
  meter.className = "synergy-meter";
  const labelRow = document.createElement("div");
  labelRow.className = "synergy-meter__label";
  const label = document.createElement("span");
  label.textContent = "Sinergia ecosistema";
  const value = document.createElement("span");
  value.className = "synergy-meter__value";
  value.textContent = `${info.percent}%`;
  labelRow.append(label, value);
  meter.appendChild(labelRow);
  const track = document.createElement("div");
  track.className = "synergy-meter__track";
  const progress = document.createElement("div");
  progress.className = "synergy-meter__progress";
  progress.style.setProperty("--progress", `${info.percent}%`);
  track.appendChild(progress);
  meter.appendChild(track);
  return meter;
}

function findBiomeById(biomeId) {
  if (!biomeId) return null;
  const fromPick = state.pick?.biomes?.find((biome) => biome.id === biomeId);
  if (fromPick) return fromPick;
  const fromCatalog = state.data?.biomi?.find((biome) => biome.id === biomeId);
  if (fromCatalog) return fromCatalog;
  return null;
}

function findSpeciesInPick(biomeId, speciesId) {
  if (!biomeId || !speciesId) return null;
  const bucket = state.pick?.species?.[biomeId];
  if (!Array.isArray(bucket)) return null;
  return bucket.find((sp) => sp.id === speciesId) ?? null;
}

function splitRoleTokens(value) {
  if (typeof value !== "string") return [];
  return value
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

function roleTokenCount(species) {
  const tokens = new Set();
  if (Array.isArray(species?.roles)) {
    species.roles.forEach((role) => {
      splitRoleTokens(role).forEach((token) => tokens.add(token.toLowerCase()));
    });
  }
  splitRoleTokens(species?.role_trofico ?? "").forEach((token) => tokens.add(token.toLowerCase()));
  return tokens.size;
}

function hazardSignalCount(species) {
  let hazardSignals = 0;
  const candidates = [
    species?.meta?.hazard_profile,
    species?.hazard_profile,
    species?.hazards_expected,
    species?.hazardsExpected,
  ];
  candidates.forEach((list) => {
    if (Array.isArray(list) && list.length > hazardSignals) {
      hazardSignals = list.length;
    }
  });
  if (species?.flags?.threat || /minaccia|hazard|evento/i.test(species?.role_trofico ?? "")) {
    hazardSignals = Math.max(hazardSignals, 1);
    hazardSignals += 1;
  }
  return hazardSignals;
}

function calculateSpeciesMetrics(species) {
  const tier = Number.parseFloat(tierOf(species) ?? 0);
  const hazardSignals = hazardSignalCount(species);
  const roleTokens = roleTokenCount(species);
  return {
    tierAverage: clampScale(Number.isFinite(tier) ? tier : 0),
    hazardDensity: clampScale(hazardSignals),
    roleDiversity: clampScale(roleTokens),
    detail: {
      tier: Number.isFinite(tier) ? tier : 0,
      hazardSignals,
      roleTokens,
    },
  };
}

function roleDisplayName(species) {
  if (!species?.role_trofico) {
    return "Ruolo sconosciuto";
  }
  return titleCase(species.role_trofico.replace(/_/g, " "));
}

function formatTierValue(value) {
  const parsed = Number.parseFloat(value ?? 0);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return `T${safe.toFixed(1)}`;
}

function createComparisonEntry(biome, species) {
  const key = createPinKey(biome, species);
  return {
    key,
    biomeId: biome?.id ?? "biome",
    biomeLabel: biome?.label ?? titleCase(biome?.id ?? ""),
    speciesId: species?.id ?? key,
    displayName: species?.display_name ?? species?.id ?? "Specie",
    roleName: roleDisplayName(species),
    metrics: calculateSpeciesMetrics(species),
    synthetic: Boolean(species?.synthetic || biome?.synthetic),
  };
}

function createQuickButton({ icon, label, className }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = ["quick-button", className].filter(Boolean).join(" ");
  button.innerHTML = `<span aria-hidden="true">${icon}</span><span class="visually-hidden">${label}</span>`;
  button.setAttribute("aria-pressed", "false");
  return button;
}

function togglePinned(biome, species, { announce = true } = {}) {
  const key = createPinKey(biome, species);
  const store = state.cardState.pinned;
  const displayName = species?.display_name ?? species?.id ?? "Specie";
  if (store.has(key)) {
    store.delete(key);
    if (announce) {
      setStatus(`${displayName} rimosso dalle specie pinnate.`, "info");
    }
    updatePinButtonState(key, false);
    renderPinnedSummary();
    return false;
  }
  const tier = tierOf(species);
  const rarity = rarityFromTier(tier);
  store.set(key, {
    key,
    speciesId: species?.id ?? key,
    biomeId: biome?.id ?? "biome",
    displayName,
    biomeLabel: biome?.label ?? titleCase(biome?.id ?? ""),
    tier,
    rarity: rarity.label,
    slug: rarity.slug,
    synthetic: Boolean(species?.synthetic || biome?.synthetic),
  });
  if (announce) {
    setStatus(`${displayName} aggiunto alle specie pinnate.`, "success");
  }
  updatePinButtonState(key, true);
  renderPinnedSummary();
  return true;
}

function removeComparisonEntry(key, { announce = false, reRender = true } = {}) {
  const store = state.cardState.comparison;
  if (!store?.has(key)) return;
  const entry = store.get(key);
  store.delete(key);
  updateCompareButtonState(key, false);
  if (announce) {
    const label = entry?.displayName ?? "Specie";
    setStatus(`${label} rimossa dal confronto.`, "info");
  }
  if (reRender) {
    renderComparisonPanel();
  }
}

function toggleComparison(biome, species, { announce = true } = {}) {
  const key = createPinKey(biome, species);
  const store = state.cardState.comparison;
  if (store.has(key)) {
    removeComparisonEntry(key, { announce, reRender: true });
    return false;
  }
  if (store.size >= 3) {
    if (announce) {
      setStatus("Puoi confrontare al massimo tre specie alla volta.", "warn");
    }
    return false;
  }
  const entry = createComparisonEntry(biome, species);
  store.set(key, entry);
  updateCompareButtonState(key, true);
  renderComparisonPanel();
  if (announce) {
    setStatus(`${entry.displayName} aggiunta al confronto.`, "success");
  }
  return true;
}

function syncComparisonStore() {
  const store = state.cardState.comparison;
  if (!store?.size) return 0;
  const stale = [];
  store.forEach((entry, key) => {
    const species = findSpeciesInPick(entry.biomeId, entry.speciesId);
    if (!species) {
      stale.push(key);
      return;
    }
    entry.displayName = species.display_name ?? species.id ?? entry.displayName;
    entry.roleName = roleDisplayName(species);
    entry.metrics = calculateSpeciesMetrics(species);
    const biome = findBiomeById(entry.biomeId);
    entry.biomeLabel = biome?.label ?? titleCase(biome?.id ?? entry.biomeId ?? "");
    entry.synthetic = Boolean(species.synthetic || biome?.synthetic);
  });
  stale.forEach((key) => {
    store.delete(key);
    updateCompareButtonState(key, false);
  });
  return stale.length;
}

function ensureComparisonChart() {
  if (!elements.compareCanvas) return null;
  if (comparisonChart) return comparisonChart;
  if (typeof Chart === "undefined") {
    if (!chartUnavailableNotified) {
      console.warn(
        "Chart.js non disponibile: il confronto radar verrà mostrato solo come elenco."
      );
      chartUnavailableNotified = true;
    }
    if (elements.compareFallback) {
      elements.compareFallback.hidden = false;
    }
    elements.compareCanvas.hidden = true;
    return null;
  }

  elements.compareCanvas.hidden = false;
  if (elements.compareFallback) {
    elements.compareFallback.hidden = true;
  }

  const context = elements.compareCanvas.getContext("2d");
  if (!context) return null;

  comparisonChart = new Chart(context, {
    type: "radar",
    data: {
      labels: COMPARISON_LABELS,
      datasets: [],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          suggestedMax: 5,
          angleLines: { color: "rgba(148, 196, 255, 0.18)" },
          grid: { color: "rgba(148, 196, 255, 0.12)" },
          ticks: {
            stepSize: 1,
            showLabelBackdrop: false,
            color: "rgba(148, 196, 255, 0.65)",
          },
          pointLabels: {
            color: "rgba(226, 240, 255, 0.82)",
            font: { size: 12 },
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "#e2f0ff",
            font: { size: 12 },
          },
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          titleColor: "#f8fafc",
          bodyColor: "#f8fafc",
          borderColor: "rgba(148, 196, 255, 0.35)",
          borderWidth: 1,
          callbacks: {
            label(context) {
              const detail = context.dataset?.metaDetails ?? {};
              switch (context.dataIndex) {
                case 0: {
                  const tier = Number.isFinite(detail.tier) ? detail.tier : context.parsed.r;
                  return `Tier medio: ${formatTierValue(tier)}`;
                }
                case 1: {
                  const hazard = Number.isFinite(detail.hazardSignals)
                    ? detail.hazardSignals
                    : context.parsed.r;
                  const label = hazard === 1 ? "segnale" : "segnali";
                  return `Densità hazard: ${hazard} ${label}`;
                }
                case 2: {
                  const roles = Number.isFinite(detail.roleTokens)
                    ? detail.roleTokens
                    : context.parsed.r;
                  const label = roles === 1 ? "archetipo" : "archetipi";
                  return `Diversità ruoli: ${roles} ${label}`;
                }
                default:
                  return `${context.label}: ${context.formattedValue}`;
              }
            },
          },
        },
      },
    },
  });

  return comparisonChart;
}

function updateComparisonChart(entries) {
  if (!entries?.length) {
    if (comparisonChart) {
      comparisonChart.data.datasets = [];
      comparisonChart.update();
    }
    return;
  }

  const chart = ensureComparisonChart();
  if (!chart) {
    if (elements.compareFallback) {
      elements.compareFallback.hidden = false;
    }
    return;
  }

  chart.data.labels = COMPARISON_LABELS;
  chart.data.datasets = entries.map((entry) => {
    const colors = colorPairFromString(entry.key);
    return {
      label: entry.displayName,
      data: [
        entry.metrics.tierAverage,
        entry.metrics.hazardDensity,
        entry.metrics.roleDiversity,
      ],
      fill: true,
      backgroundColor: colors.fill,
      borderColor: colors.border,
      pointBackgroundColor: colors.border,
      pointBorderColor: "#0f172a",
      pointHoverBackgroundColor: "#f8fafc",
      pointHoverBorderColor: colors.border,
      metaDetails: entry.metrics.detail,
    };
  });
  chart.update();
}

function renderComparisonPanel() {
  const list = elements.compareList;
  if (!list) return;
  const entries = Array.from(state.cardState.comparison.values());
  list.innerHTML = "";
  const hasEntries = entries.length > 0;
  list.hidden = !hasEntries;
  if (elements.compareEmpty) {
    elements.compareEmpty.hidden = hasEntries;
  }
  if (elements.comparePanel) {
    elements.comparePanel.dataset.state = hasEntries ? "filled" : "empty";
  }
  if (elements.summaryContainer) {
    elements.summaryContainer.dataset.hasComparison = hasEntries ? "true" : "false";
  }
  if (elements.compareChartContainer) {
    elements.compareChartContainer.hidden = !hasEntries;
  }

  entries.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "generator-compare__item";
    item.dataset.compareKey = entry.key;

    const info = document.createElement("div");
    info.className = "generator-compare__info";
    item.appendChild(info);

    const name = document.createElement("p");
    name.className = "generator-compare__name";
    name.textContent = entry.displayName;
    info.appendChild(name);

    const meta = document.createElement("p");
    meta.className = "generator-compare__meta";
    const metaParts = [entry.biomeLabel];
    if (entry.roleName) {
      metaParts.push(entry.roleName);
    }
    if (entry.synthetic) {
      metaParts.push("Synth");
    }
    meta.textContent = metaParts.filter(Boolean).join(" · ");
    info.appendChild(meta);

    const metrics = document.createElement("div");
    metrics.className = "generator-compare__metrics";

    const tierMetric = document.createElement("span");
    tierMetric.className = "generator-compare__metric";
    tierMetric.innerHTML = `<span class="generator-compare__metric-label">Tier medio</span> ${formatTierValue(
      entry.metrics.detail.tier
    )}`;
    metrics.appendChild(tierMetric);

    const hazardMetric = document.createElement("span");
    hazardMetric.className = "generator-compare__metric";
    const hazardSignals = Number.isFinite(entry.metrics.detail.hazardSignals)
      ? entry.metrics.detail.hazardSignals
      : 0;
    const hazardLabel = hazardSignals === 1 ? "segnale" : "segnali";
    hazardMetric.innerHTML = `<span class="generator-compare__metric-label">Densità hazard</span> ${hazardSignals} ${hazardLabel}`;
    metrics.appendChild(hazardMetric);

    const roleMetric = document.createElement("span");
    roleMetric.className = "generator-compare__metric";
    const roleTokens = Number.isFinite(entry.metrics.detail.roleTokens)
      ? entry.metrics.detail.roleTokens
      : 0;
    const roleLabel = roleTokens === 1 ? "archetipo" : "archetipi";
    roleMetric.innerHTML = `<span class="generator-compare__metric-label">Diversità ruoli</span> ${roleTokens} ${roleLabel}`;
    metrics.appendChild(roleMetric);

    info.appendChild(metrics);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "generator-compare__remove";
    remove.dataset.action = "remove-compare";
    remove.dataset.compareKey = entry.key;
    remove.innerHTML = "&times;";
    item.appendChild(remove);

    list.appendChild(item);
  });

  if (hasEntries) {
    updateComparisonChart(entries);
  } else if (elements.compareFallback) {
    elements.compareFallback.hidden = true;
    if (elements.compareCanvas) {
      elements.compareCanvas.hidden = false;
    }
    updateComparisonChart([]);
  }
}

function attachComparisonHandlers() {
  const list = elements.compareList;
  if (!list) return;
  list.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("[data-action=\"remove-compare\"]");
    if (!button) return;
    event.preventDefault();
    const { compareKey } = button.dataset;
    if (!compareKey) return;
    removeComparisonEntry(compareKey, { announce: true });
  });
}

function toggleSquad(biome, species) {
  const key = createPinKey(biome, species);
  const store = state.cardState.squad;
  const displayName = species?.display_name ?? species?.id ?? "Specie";
  if (store.has(key)) {
    store.delete(key);
    setStatus(`${displayName} rimosso dalla squadra rapida.`, "info");
    return false;
  }
  store.set(key, {
    key,
    speciesId: species?.id ?? key,
    biomeId: biome?.id ?? "biome",
    displayName,
    tier: tierOf(species),
  });
  setStatus(`${displayName} aggiunto alla squadra rapida.`, "success");
  return true;
}

function createSpeciesCard(biome, species) {
  const card = document.createElement("article");
  card.className = "species-card";
  const pinKey = createPinKey(biome, species);
  if (state.cardState.pinned.has(pinKey)) {
    card.dataset.pinned = "true";
  }
  if (state.cardState.comparison.has(pinKey)) {
    card.dataset.compare = "true";
  }

  const media = document.createElement("div");
  media.className = "species-card__media";
  media.textContent = speciesPlaceholderIcon(species);
  card.appendChild(media);

  const info = document.createElement("div");
  info.className = "species-card__info";
  card.appendChild(info);

  const header = document.createElement("div");
  header.className = "species-card__header";
  info.appendChild(header);

  const title = document.createElement("div");
  title.className = "species-card__title";
  header.appendChild(title);

  const name = document.createElement("h4");
  name.className = "species-card__name";
  name.textContent = species.display_name ?? species.id ?? "Specie sconosciuta";
  title.appendChild(name);

  const id = document.createElement("p");
  id.className = "species-card__id";
  id.textContent = species.id ?? "—";
  title.appendChild(id);

  const controls = document.createElement("div");
  controls.className = "species-card__controls";
  header.appendChild(controls);

  const badges = document.createElement("div");
  badges.className = "species-card__badges";
  const tier = tierOf(species);
  const rarity = rarityFromTier(tier);
  badges.appendChild(createBadgeElement(rarity.label, `rarity-${rarity.slug}`));
  if (species.synthetic) {
    badges.appendChild(createBadgeElement("Synth", "synth"));
  }
  controls.appendChild(badges);

  const actions = document.createElement("div");
  actions.className = "species-card__actions";
  controls.appendChild(actions);

  const squadButton = createQuickButton({
    icon: "⚔️",
    label: `Aggiungi ${name.textContent} alla squadra rapida`,
    className: "quick-button--squad",
  });
  applyQuickButtonState(squadButton, state.cardState.squad.has(pinKey));
  squadButton.addEventListener("click", (event) => {
    event.preventDefault();
    const active = toggleSquad(biome, species);
    applyQuickButtonState(squadButton, active);
  });
  actions.appendChild(squadButton);

  const pinButton = createQuickButton({
    icon: "📌",
    label: `Pin ${name.textContent} nel riepilogo`,
    className: "quick-button--pin",
  });
  pinButton.dataset.pinKey = pinKey;
  applyQuickButtonState(pinButton, state.cardState.pinned.has(pinKey));
  pinButton.addEventListener("click", (event) => {
    event.preventDefault();
    const active = togglePinned(biome, species);
    applyQuickButtonState(pinButton, active);
    card.dataset.pinned = active ? "true" : "false";
  });
  actions.appendChild(pinButton);

  const compareButton = createQuickButton({
    icon: "📊",
    label: `Confronta ${name.textContent} nel radar`,
    className: "quick-button--compare",
  });
  compareButton.dataset.compareKey = pinKey;
  applyQuickButtonState(compareButton, state.cardState.comparison.has(pinKey));
  compareButton.addEventListener("click", (event) => {
    event.preventDefault();
    const active = toggleComparison(biome, species);
    applyQuickButtonState(compareButton, active);
    card.dataset.compare = active ? "true" : "false";
  });
  actions.appendChild(compareButton);

  const meta = document.createElement("div");
  meta.className = "species-card__meta";
  const role = species.role_trofico ? titleCase(species.role_trofico) : "Ruolo sconosciuto";
  const roleSpan = document.createElement("span");
  roleSpan.textContent = role;
  meta.appendChild(roleSpan);
  const tierSpan = document.createElement("span");
  tierSpan.textContent = `Tier T${tier}`;
  meta.appendChild(tierSpan);
  const notableFlags = ["keystone", "apex", "bridge", "threat", "event"].filter((flag) => species.flags?.[flag]);
  if (notableFlags.length) {
    const flagSpan = document.createElement("span");
    flagSpan.textContent = `Flag: ${notableFlags.map((flag) => titleCase(flag.replace(/_/g, " "))).join(", ")}`;
    meta.appendChild(flagSpan);
  }
  info.appendChild(meta);

  const tags = Array.isArray(species.functional_tags) ? species.functional_tags : [];
  if (tags.length) {
    const tagContainer = document.createElement("div");
    tagContainer.className = "species-card__tags";
    const maxVisible = 5;
    tags.slice(0, maxVisible).forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = tag;
      tagContainer.appendChild(chip);
    });
    if (tags.length > maxVisible) {
      const remainder = document.createElement("span");
      remainder.className = "chip";
      remainder.textContent = `+${tags.length - maxVisible}`;
      tagContainer.appendChild(remainder);
    }
    info.appendChild(tagContainer);
  }

  const synergy = calculateSynergy(species, biome);
  const meter = createSynergyMeter(synergy);
  info.appendChild(meter);

  if (synergy.summary) {
    const summary = document.createElement("p");
    summary.className = "species-card__summary";
    summary.textContent = synergy.summary;
    info.appendChild(summary);
  }

  return card;
}

function buildBiomeCard(biome, filters) {
  const card = document.createElement("article");
  card.className = "generator-card";
  card.dataset.biomeId = biome.id;

  const media = document.createElement("div");
  media.className = "generator-card__media";
  media.style.background = gradientFromString(biome.id ?? biome.label ?? "");
  const mediaLabel = document.createElement("span");
  mediaLabel.textContent = biomePlaceholderLabel(biome);
  media.appendChild(mediaLabel);
  card.appendChild(media);

  const body = document.createElement("div");
  body.className = "generator-card__body";
  card.appendChild(body);

  const header = document.createElement("div");
  header.className = "generator-card__header";
  body.appendChild(header);

  const titleGroup = document.createElement("div");
  titleGroup.className = "generator-card__title-group";
  header.appendChild(titleGroup);

  const title = document.createElement("h3");
  title.className = "generator-card__title";
  title.textContent = biome.synthetic ? biome.label ?? titleCase(biome.id ?? "") : titleCase(biome.id ?? "");
  titleGroup.appendChild(title);

  const subtitle = document.createElement("p");
  subtitle.className = "generator-card__subtitle";
  subtitle.textContent = `ID: ${biome.id}`;
  titleGroup.appendChild(subtitle);

  const badges = document.createElement("div");
  badges.className = "generator-card__badges";
  const speciesCount = (state.pick.species?.[biome.id] ?? []).length;
  badges.appendChild(createBadgeElement(`${speciesCount} specie`, ""));
  if (biome.synthetic) {
    badges.appendChild(createBadgeElement("Synth", "synth"));
  }
  header.appendChild(badges);

  const meta = document.createElement("p");
  meta.className = "generator-card__meta";
  if (biome.synthetic) {
    const parents = (biome.parents ?? [])
      .map((parent) => parent.label ?? titleCase(parent.id ?? ""))
      .filter(Boolean);
    meta.textContent = parents.length
      ? `Origine sintetica da ${parents.join(" + ")}`
      : "Origine sintetica procedurale.";
  } else {
    meta.textContent = biome.description ?? "Bioma del catalogo originale.";
  }
  body.appendChild(meta);

  if (!biome.synthetic) {
    const links = document.createElement("div");
    links.className = "generator-card__links";
    const biomeHref = resolvePackHref(biome.path);
    if (biomeHref) {
      const link = document.createElement("a");
      link.href = biomeHref;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Bioma YAML";
      links.appendChild(link);
    }
    const foodwebHref = biome.foodweb?.path ? resolvePackHref(biome.foodweb.path) : null;
    if (foodwebHref) {
      const link = document.createElement("a");
      link.href = foodwebHref;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Foodweb";
      links.appendChild(link);
    }
    try {
      const reportHref = new URL(`catalog.html#bioma-${biome.id}`, window.location.href).toString();
      const link = document.createElement("a");
      link.href = reportHref;
      link.textContent = "Report";
      links.appendChild(link);
    } catch (error) {
      console.warn("Impossibile calcolare il link al report del bioma", biome.id, error);
    }
    if (links.childElementCount) {
      body.appendChild(links);
    }
  }

  const speciesContainer = document.createElement("div");
  speciesContainer.className = "generator-card__species";
  const picked = state.pick.species?.[biome.id] ?? [];
  if (!picked.length) {
    const empty = document.createElement("p");
    empty.className = "generator-card__empty";
    const filtersText = [];
    if (filters.flags.length) filtersText.push(`flag: ${filters.flags.join(", ")}`);
    if (filters.roles.length) filtersText.push(`ruoli: ${filters.roles.join(", ")}`);
    if (filters.tags.length) filtersText.push(`tag: ${filters.tags.join(", ")}`);
    empty.textContent = filtersText.length
      ? `Nessuna specie soddisfa i filtri correnti (${filtersText.join(" · ")}).`
      : "Nessuna specie estratta, effettua un nuovo re-roll.";
    speciesContainer.appendChild(empty);
  } else {
    picked.forEach((sp) => {
      speciesContainer.appendChild(createSpeciesCard(biome, sp));
    });
  }
  body.appendChild(speciesContainer);

  const traitInfo = gatherTraitInfoForBiome(biome);
  const traitBlock = traitInfo ? buildTraitBlock(traitInfo, { synthetic: Boolean(biome.synthetic) }) : null;
  if (traitBlock) {
    body.appendChild(traitBlock);
  }

  return card;
}

function renderBiomes(filters) {
  updateSummaryCounts();
  const grid = elements.biomeGrid;
  if (!grid) return;
  grid.innerHTML = "";

  const removed = syncComparisonStore();
  if (removed) {
    const label = removed === 1 ? "Una specie" : `${removed} specie`;
    setStatus(`${label} rimosse dal confronto perché non più disponibili.`, "warn");
  }

  if (!state.pick.biomes.length) {
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "Genera un ecosistema per iniziare.";
    grid.appendChild(placeholder);
    renderComparisonPanel();
    return;
  }

  state.pick.biomes.forEach((biome) => {
    grid.appendChild(buildBiomeCard(biome, filters));
  });
  renderComparisonPanel();
}

function renderPinnedSummary() {
  const list = elements.pinnedList;
  const empty = elements.pinnedEmpty;
  if (!list) return;

  const entries = Array.from(state.cardState.pinned.values());
  list.innerHTML = "";
  const hasEntries = entries.length > 0;
  list.hidden = !hasEntries;
  if (empty) {
    empty.hidden = hasEntries;
  }
  if (elements.summaryContainer) {
    elements.summaryContainer.dataset.hasPins = hasEntries ? "true" : "false";
  }
  if (!hasEntries) {
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "generator-pins__item";
    item.dataset.pinKey = entry.key;

    const stillPresent = Boolean(findSpeciesInPick(entry.biomeId, entry.speciesId));
    if (!stillPresent) {
      item.dataset.state = "stale";
    }

    const header = document.createElement("div");
    header.className = "generator-pins__header";

    const name = document.createElement("span");
    name.className = "generator-pins__name";
    name.textContent = entry.displayName;
    header.appendChild(name);

    const controls = document.createElement("div");
    controls.className = "generator-pins__controls";

    const rarityBadge = createBadgeElement(entry.rarity, `rarity-${entry.slug}`);
    rarityBadge.classList.add("generator-pins__badge");
    controls.appendChild(rarityBadge);

    const unpin = document.createElement("button");
    unpin.type = "button";
    unpin.className = "generator-pins__unpin";
    unpin.textContent = "Rimuovi";
    unpin.addEventListener("click", (event) => {
      event.preventDefault();
      const biome =
        findBiomeById(entry.biomeId) ?? { id: entry.biomeId, label: entry.biomeLabel, synthetic: entry.synthetic };
      const species =
        findSpeciesInPick(entry.biomeId, entry.speciesId) ??
        {
          id: entry.speciesId,
          display_name: entry.displayName,
          balance: { threat_tier: `T${entry.tier}` },
          synthetic: entry.synthetic,
        };
      togglePinned(biome, species);
    });
    controls.appendChild(unpin);

    header.appendChild(controls);
    item.appendChild(header);

    const meta = document.createElement("span");
    meta.className = "generator-pins__meta";
    const metaParts = [entry.biomeLabel, `T${entry.tier}`];
    if (entry.synthetic) {
      metaParts.push("Synth");
    }
    if (!stillPresent) {
      metaParts.push("fuori rotazione");
    }
    meta.textContent = metaParts.join(" · ");
    item.appendChild(meta);

    list.appendChild(item);
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

setupAnchorNavigation();
setupCodexControls();
renderTraitExpansions();
renderPinnedSummary();
renderComparisonPanel();
attachComparisonHandlers();
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
